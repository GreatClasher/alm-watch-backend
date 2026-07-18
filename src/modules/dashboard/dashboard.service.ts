import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../config/database.config';
import { recordings } from '../recording/entities/recording.entity';
import { observations } from '../observation/entities/observation.entity';
import { episodes } from '../episode/entities/episode.entity';
import { pipelineRuns } from '../pipeline/entities/pipeline-run.entity';
import { memories } from '../memory/entities/memory.entity';

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  async getStats() {
    const recStats = await this.db.select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(*) filter (where status = 'active')`,
    }).from(recordings);

    const obsStats = await this.db.select({
      total: sql<number>`count(*)`,
    }).from(observations);

    const epiStats = await this.db.select({
      total: sql<number>`count(*)`,
    }).from(episodes);

    const pipeStatsRaw = await this.db.select({
      targetLayer: pipelineRuns.targetLayer,
      status: pipelineRuns.status,
      count: sql<number>`count(*)`,
    }).from(pipelineRuns)
      .groupBy(pipelineRuns.targetLayer, pipelineRuns.status);

    const pipelineStats = pipeStatsRaw.reduce((acc, curr) => {
      const layer = curr.targetLayer;
      const status = curr.status;
      if (!acc[layer]) acc[layer] = { pending: 0, processing: 0, completed: 0, failed: 0 };
      acc[layer][status] = Number(curr.count);
      return acc;
    }, {} as Record<string, Record<string, number>>);

    return {
      recordings: {
        total: Number(recStats[0]?.total || 0),
        active: Number(recStats[0]?.active || 0),
      },
      observations: {
        total: Number(obsStats[0]?.total || 0),
      },
      episodes: {
        total: Number(epiStats[0]?.total || 0),
      },
      pipelineRuns: pipelineStats,
    };
  }

  async getLayerData(layer: string, userId?: string, limit: number = 50) {
    switch(layer) {
      case 'recordings':
        return this.db.select()
          .from(recordings)
          // If userId provided, we could filter here. Assuming the user wants all for now or filter by user.
          .orderBy(desc(recordings.createdAt))
          .limit(limit);
      case 'observations':
        return this.db.select()
          .from(observations)
          .orderBy(desc(observations.createdAt))
          .limit(limit);
      case 'episodes':
        return this.db.select()
          .from(episodes)
          .orderBy(desc(episodes.createdAt))
          .limit(limit);
      case 'pipelineRuns':
        return this.db.select()
          .from(pipelineRuns)
          .orderBy(desc(pipelineRuns.createdAt))
          .limit(limit);
      case 'memories':
        return this.db.select()
          .from(memories)
          .orderBy(desc(memories.createdAt))
          .limit(limit);
      default:
        throw new Error(`Layer ${layer} not supported for data inspection`);
    }
  }
}
