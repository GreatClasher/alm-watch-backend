import { Controller, Get, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../config/database.config';
import { episodes } from './entities/episode.entity';
import { desc } from 'drizzle-orm';

@Controller('episodes')
export class EpisodeController {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  @Get()
  async getEpisodes() {
    const records = await this.db.select().from(episodes).orderBy(desc(episodes.createdAt)).limit(50);
    return {
      episodes: records.map(ep => ({
        id: ep.id,
        title: ep.title,
        summary: ep.summary,
        time: ep.createdAt.toLocaleTimeString(),
        entities: []
      }))
    };
  }
}
