import { Controller, Post, Body, Inject, Get } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../config/database.config';
import { observations } from '../observation/entities/observation.entity';
import { conversations } from '../conversation/entities/conversation.entity';
import { pipelineRuns } from '../pipeline/entities/pipeline-run.entity';
import { speakers } from '../speaker/entities/speaker.entity';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { TargetLayer, PipelineStatus } from '../pipeline/pipeline.enums';

// ponytail: keeping old route prefix for backward compat with AI worker
@Controller('transcription')
export class AiOrchestratorController {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly aiService: AiOrchestratorService
  ) {}

  @Get('queue-status')
  async getQueueStatus() {
    return this.aiService.getQueueStatus();
  }

  @Post('webhook')
  async receiveTranscription(@Body() body: any) {
    const { recording_id, observations: incomingObservations } = body;
    
    await this.db.transaction(async (tx) => {
      // Find the pending pipeline_run record
      const runRecords = await tx.select().from(pipelineRuns)
        .where(and(eq(pipelineRuns.recordingId, recording_id), eq(pipelineRuns.targetLayer, TargetLayer.OBSERVATION)))
        .limit(1);
      const runRecord = runRecords[0];
      if (!runRecord) return;
      const runId = runRecord.id;
      const userId = runRecord.userId;

      let currentConversationId: string | null = null;
      let prevEnd = -Infinity;

      for (const u of incomingObservations) {
        let assignedSpeakerId: string | null = null;

        // Speaker embedding matching (cosine distance on pgvector)
        const isDummyEmbedding = u.voice_embedding && u.voice_embedding.every((val: number) => val === 0.0);
        
        if (u.voice_embedding && Array.isArray(u.voice_embedding) && u.voice_embedding.length > 0 && !isDummyEmbedding) {
          const embeddingArray = `[${u.voice_embedding.join(',')}]`;
          
          try {
            const distanceQuery = await tx.select({
              id: speakers.id,
              distance: sql<number>`${speakers.voiceEmbedding} <=> ${embeddingArray}::vector`
            })
            .from(speakers)
            .orderBy(sql`${speakers.voiceEmbedding} <=> ${embeddingArray}::vector`)
            .limit(1);

            const closest = distanceQuery[0];
            
            if (closest && closest.distance < 0.25) {
              assignedSpeakerId = closest.id;
            } else {
              const newSpeaker = await tx.insert(speakers).values({
                userId,
                name: `Voice ${Math.floor(Math.random() * 10000)}`,
                voiceEmbedding: u.voice_embedding,
              }).returning({ id: speakers.id });
              
              if (newSpeaker.length > 0) {
                assignedSpeakerId = newSpeaker[0]!.id;
              }
            }
          } catch (e) {
            console.error('Error during vector search or speaker insertion:', e);
          }
        }

        // ponytail: conversation grouping by 120s silence gap
        const obsStart = u.timestamp_start;
        if (currentConversationId === null || (obsStart - prevEnd > 120)) {
          const conv = await tx.insert(conversations).values({
            userId,
            recordingId: recording_id,
            startedAt: new Date(obsStart * 1000), // seconds to Date
          }).returning({ id: conversations.id });
          currentConversationId = conv[0]!.id;
        }
        prevEnd = u.timestamp_end;

        // Build payload — embed emotion from prosody into speech payload
        const payload = u.type === 'speech' ? {
          text: u.payload?.text,
          speaker_label: u.speaker_label || u.payload?.speaker_label,
          language: u.payload?.language || 'en',
          emotion: u.payload?.emotion || 'neutral',
          emotion_confidence: u.payload?.emotion_confidence || 0.5,
        } : u.payload;

        await tx.insert(observations).values({
          userId,
          recordingId: recording_id,
          conversationId: currentConversationId,
          type: u.type || 'speech',
          timestampStart: new Date(obsStart * 1000),
          timestampEnd: u.timestamp_end ? new Date(u.timestamp_end * 1000) : null,
          payload,
          speakerId: assignedSpeakerId,
          confidence: u.confidence,
          pipelineRunId: runId,
        });
      }

      // Mark observation pipeline_run as completed
      await tx.update(pipelineRuns)
        .set({ status: PipelineStatus.COMPLETED, completedAt: new Date() })
        .where(eq(pipelineRuns.id, runId));

      // Create new episode pipeline_run as pending
      await tx.insert(pipelineRuns).values({
        userId,
        recordingId: recording_id,
        targetLayer: TargetLayer.EPISODE,
        status: PipelineStatus.PENDING,
        modelVersions: {},
      });
    });

    return { status: 'ok' };
  }
}
