import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../config/database.config';
import { pipelineRuns } from './entities/pipeline-run.entity';
import { TargetLayer, PipelineStatus } from './pipeline.enums';

@Injectable()
export class PipelineService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  async createRun(userId: string, recordingId: string, targetLayer: TargetLayer, modelVersions: Record<string, string>) {
    const [run] = await this.db.insert(pipelineRuns).values({
      userId,
      recordingId,
      targetLayer,
      status: PipelineStatus.PENDING,
      modelVersions
    }).returning();
    
    return run;
  }
}
