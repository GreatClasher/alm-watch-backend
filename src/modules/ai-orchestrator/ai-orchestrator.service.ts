import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql, notExists } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DRIZZLE } from '../../config/database.config';
import { recordings } from '../recording/entities/recording.entity';
import { pipelineRuns } from '../pipeline/entities/pipeline-run.entity';
import { Redis } from 'ioredis';
import { EpisodeService } from '../episode/episode.service';
import { MemoryService } from '../memory/memory.service';
import { conversations } from '../conversation/entities/conversation.entity';
import { episodes } from '../episode/entities/episode.entity';
import { observations } from '../observation/entities/observation.entity';
import { OnModuleDestroy } from '@nestjs/common';
import { TargetLayer, PipelineStatus } from '../pipeline/pipeline.enums';

@Injectable()
export class AiOrchestratorService implements OnModuleDestroy {
  private redisClient: Redis;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    @InjectPinoLogger(AiOrchestratorService.name) private readonly logger: PinoLogger,
    private readonly episodeService: EpisodeService,
    private readonly memoryService: MemoryService,
  ) {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });
  }

  onModuleDestroy() {
    this.redisClient.quit();
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async scanForCompletedSessions() {
    // ponytail: keeping function name for now
    const finalizedRecordings = await this.db
      .select()
      .from(recordings)
      .where(
        and(
          eq(recordings.status, 'finalized'),
          notExists(
            this.db.select().from(pipelineRuns).where(and(eq(pipelineRuns.recordingId, recordings.id), eq(pipelineRuns.targetLayer, TargetLayer.OBSERVATION)))
          )
        )
      );

    // Fetch current queue to prevent duplicates
    const queuedJobs = await this.redisClient.lrange('ai_jobs', 0, -1);
    const queuedRecordingIds = new Set(
      queuedJobs.map(job => {
        try { return JSON.parse(job).recordingId; } 
        catch { return null; }
      }).filter(Boolean)
    );

    for (const rec of finalizedRecordings) {
      if (queuedRecordingIds.has(rec.id)) {
        continue; // Already in queue, skip
      }

      this.logger.info({ recordingId: rec.id }, 'Recording finalized. Enqueueing for AI processing.');
      
      // 1. Create pipeline_run record to mark as pending
      await this.db.insert(pipelineRuns).values({
        userId: rec.userId,
        recordingId: rec.id,
        targetLayer: TargetLayer.OBSERVATION,
        status: PipelineStatus.PENDING,
        modelVersions: {},
      });

      // 2. Queue the job for the Python worker
      await this.redisClient.rpush('ai_jobs', JSON.stringify({
        recordingId: rec.id,
        deviceId: rec.deviceId,
      }));
      queuedRecordingIds.add(rec.id);
    }

    // 3. Find runs that are stuck in 'pending' for > 5 minutes for OBSERVATION
    const stuckRuns = await this.db
      .select()
      .from(pipelineRuns)
      .where(
        and(
          eq(pipelineRuns.status, PipelineStatus.PENDING),
          eq(pipelineRuns.targetLayer, TargetLayer.OBSERVATION),
          sql`NOW() - ${pipelineRuns.createdAt} > interval '5 minutes'`
        )
      );

    for (const run of stuckRuns) {
      if (queuedRecordingIds.has(run.recordingId)) {
        continue; // Already in queue, skip
      }

      this.logger.info({ recordingId: run.recordingId }, 'Pipeline run stuck in pending. Re-enqueueing for AI processing.');
      
      // Re-stamp startedAt so we don't re-enqueue again in 5min
      await this.db.update(pipelineRuns)
        .set({ startedAt: new Date() })
        .where(eq(pipelineRuns.id, run.id));

      const recRecords = await this.db.select().from(recordings).where(eq(recordings.id, run.recordingId));
      if (recRecords.length > 0) {
        await this.redisClient.rpush('ai_jobs', JSON.stringify({
          recordingId: run.recordingId,
          deviceId: recRecords[0]!.deviceId,
        }));
        queuedRecordingIds.add(run.recordingId);
      }
    }

    // 4. Find and process pending EPISODE pipeline runs (and recover stuck processing ones)
    const pendingEpisodes = await this.db
      .select()
      .from(pipelineRuns)
      .where(
        and(
          eq(pipelineRuns.targetLayer, TargetLayer.EPISODE),
          sql`("pipeline_runs"."status" = 'pending' OR ("pipeline_runs"."status" = 'processing' AND NOW() - "pipeline_runs"."started_at" > interval '5 minutes'))`
        )
      );

    for (const run of pendingEpisodes) {
      this.logger.info({ recordingId: run.recordingId }, 'Processing Layer 4 (Episode) from pending pipeline run.');

      // Mark as PROCESSING so another cron cycle doesn't pick it up
      await this.db.update(pipelineRuns)
        .set({ status: PipelineStatus.PROCESSING, startedAt: new Date() })
        .where(eq(pipelineRuns.id, run.id));

      try {
        await this.processLayer4(run.recordingId, run.id);
        
        // On success, mark as COMPLETED
        await this.db.update(pipelineRuns)
          .set({ status: PipelineStatus.COMPLETED, completedAt: new Date() })
          .where(eq(pipelineRuns.id, run.id));

        // Enqueue MEMORY layer
        const rec = await this.db.select().from(recordings).where(eq(recordings.id, run.recordingId)).limit(1);
        if (rec.length > 0) {
          await this.db.insert(pipelineRuns).values({
            userId: rec[0]!.userId,
            recordingId: run.recordingId,
            targetLayer: TargetLayer.MEMORY,
            status: PipelineStatus.PENDING,
            modelVersions: {},
          });
        }
      } catch (e) {
        this.logger.error(e, `Error processing layer 4 for recording ${run.recordingId}`);
        // Revert to PENDING so it can retry later, but we could also add logic to mark FAILED after max retries
        await this.db.update(pipelineRuns)
          .set({ status: PipelineStatus.PENDING, error: e instanceof Error ? e.message : 'Unknown error' })
          .where(eq(pipelineRuns.id, run.id));
      }
    }

    // 5. Find and process pending MEMORY pipeline runs
    const pendingMemories = await this.db
      .select()
      .from(pipelineRuns)
      .where(
        and(
          eq(pipelineRuns.targetLayer, TargetLayer.MEMORY),
          sql`("pipeline_runs"."status" = 'pending' OR ("pipeline_runs"."status" = 'processing' AND NOW() - "pipeline_runs"."started_at" > interval '5 minutes'))`
        )
      );

    for (const run of pendingMemories) {
      this.logger.info({ recordingId: run.recordingId }, 'Processing Layer 5 (Memory) from pending pipeline run.');

      await this.db.update(pipelineRuns)
        .set({ status: PipelineStatus.PROCESSING, startedAt: new Date() })
        .where(eq(pipelineRuns.id, run.id));

      try {
        await this.processLayer5(run.recordingId, run.id);
        
        await this.db.update(pipelineRuns)
          .set({ status: PipelineStatus.COMPLETED, completedAt: new Date() })
          .where(eq(pipelineRuns.id, run.id));
      } catch (e) {
        this.logger.error(e, `Error processing layer 5 for recording ${run.recordingId}`);
        await this.db.update(pipelineRuns)
          .set({ status: PipelineStatus.PENDING, error: e instanceof Error ? e.message : 'Unknown error' })
          .where(eq(pipelineRuns.id, run.id));
      }
    }
  }

  async queueAudioJob(recordingId: string, deviceId: string) {
    const jobPayload = JSON.stringify({ recordingId, deviceId });
    await this.redisClient.rpush('ai_jobs', jobPayload);
    this.logger.info(`Queued recording ${recordingId} for AI worker processing.`);
  }

  async getQueueStatus() {
    const queueLength = await this.redisClient.llen('ai_jobs');
    const statusRaw = await this.redisClient.get('ai_worker_status');
    const jobs = await this.redisClient.lrange('ai_jobs', 0, 5);
    
    let workerStatus = { state: 'idle' };
    if (statusRaw) {
      try { workerStatus = JSON.parse(statusRaw); } catch (e) {}
    }
    
    const upcoming = jobs.map(j => {
      try { return JSON.parse(j); } catch(e) { return null; }
    }).filter(Boolean);

    return {
      worker: workerStatus,
      queueLength,
      upcoming
    };
  }

  async processLayer4(recordingId: string, pipelineRunId: string) {
    // Finalize all active conversations for this recording
    await this.db.update(conversations)
      .set({ status: 'finalized', endedAt: new Date() })
      .where(and(eq(conversations.recordingId, recordingId), eq(conversations.status, 'active')));

    const convList = await this.db.select({ id: conversations.id }).from(conversations).where(eq(conversations.recordingId, recordingId));
    
    for (const conv of convList) {
      // Don't catch the error here, let it bubble up to the pipeline runner
      await this.episodeService.generateEpisode(conv.id, pipelineRunId);
    }
  }

  async processLayer5(recordingId: string, pipelineRunId: string) {
    const convList = await this.db.select({ id: conversations.id }).from(conversations).where(eq(conversations.recordingId, recordingId));
    
    for (const conv of convList) {
      const epList = await this.db.select().from(episodes).where(eq(episodes.conversationId, conv.id));
      
      const obsList = await this.db.select().from(observations).where(eq(observations.conversationId, conv.id)).orderBy(observations.timestampStart);
      const timeline = obsList.map(o => `[${o.timestampStart.toISOString()}] ${o.type}: ${JSON.stringify(o.payload)}`).join('\n');

      for (const ep of epList) {
        await this.memoryService.extractMemories({
          id: ep.id,
          title: ep.title,
          summary: ep.summary,
          timeline
        }, pipelineRunId);
      }
    }
  }
}
