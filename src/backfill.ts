import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from './config/database.config';
import { pipelineRuns } from './modules/pipeline/entities/pipeline-run.entity';
import { TargetLayer, PipelineStatus } from './modules/pipeline/pipeline.enums';
import { and, eq } from 'drizzle-orm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get<NodePgDatabase<any>>(DRIZZLE);
  
  // Find all EPISODE runs that are COMPLETED
  const completedEpisodes = await db.select().from(pipelineRuns).where(
    and(
      eq(pipelineRuns.targetLayer, TargetLayer.EPISODE),
      eq(pipelineRuns.status, PipelineStatus.COMPLETED)
    )
  );
  
  let count = 0;
  for (const ep of completedEpisodes) {
    // Check if MEMORY run exists
    const memRun = await db.select().from(pipelineRuns).where(
      and(
        eq(pipelineRuns.recordingId, ep.recordingId),
        eq(pipelineRuns.targetLayer, TargetLayer.MEMORY)
      )
    );

    if (memRun.length === 0) {
      await db.insert(pipelineRuns).values({
        userId: ep.userId,
        recordingId: ep.recordingId,
        targetLayer: TargetLayer.MEMORY,
        status: PipelineStatus.PENDING,
        modelVersions: {}
      });
      count++;
    }
  }
  
  console.log(`Backfilled ${count} MEMORY pipeline runs.`);
  await app.close();
  process.exit(0);
}
bootstrap();
