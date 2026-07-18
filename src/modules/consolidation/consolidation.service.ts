import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DRIZZLE } from '../../config/database.config';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { memories } from '../memory/entities/memory.entity';
import { episodes } from '../episode/entities/episode.entity';
import { observations } from '../observation/entities/observation.entity';
import { eq, and, inArray } from 'drizzle-orm';
import { LlmProvider } from '../llm/llm.provider';
import { SchemaType } from '@google/generative-ai';

@Injectable()
export class ConsolidationService {
  private readonly logger = new Logger(ConsolidationService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly llm: LlmProvider
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async consolidate() {
    this.logger.log('Consolidation job started');
    
    try {
      await this.offlineSynthesis();
    } catch (e) {
      this.logger.error('Error during consolidation job', e);
    }
    
    this.logger.log('Consolidation job finished');
  }

  private async offlineSynthesis() {
    const recentEpisodes = await this.db.select()
      .from(episodes)
      .where(eq(episodes.isSynthesized, false));

    for (const ep of recentEpisodes) {
      // Fetch episodic memories for this episode
      const epMemories = await this.db.select().from(memories).where(and(eq(memories.sourceEpisodeId, ep.id), eq(memories.kind, 'episodic')));

      if (epMemories.length > 0) {
        const memoryText = epMemories.map(m => `- [Importance: ${m.importance}] ${m.summary}`).join('\n');

        const synthesisSchema = {
          type: SchemaType.OBJECT,
          properties: {
            insights: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  summary: { type: SchemaType.STRING, description: 'A generalized semantic memory or rule derived from the episodic events' },
                  importance: { type: SchemaType.NUMBER, description: '0.0 to 1.0' }
                },
                required: ['summary', 'importance']
              }
            }
          },
          required: ['insights']
        };

        const prompt = `Synthesize generalized insights (semantic memories) from these recent episodic memories.\nEpisodic Memories:\n${memoryText}`;
        const result = await this.llm.generateStructured<any>(prompt, synthesisSchema as any);

        await this.db.transaction(async (tx) => {
          // Save Generalized Semantic Memories
          if (result.insights) {
            for (const insight of result.insights) {
              const embedding = await this.llm.generateEmbedding(insight.summary);
              await tx.insert(memories).values({
                userId: ep.userId,
                kind: 'semantic',
                summary: insight.summary,
                importance: insight.importance,
                strength: 1.0,
                embedding,
                sourceEpisodeId: ep.id,
              });
            }
          }

          // Prune low-salience episodic memories
          const lowSalienceIds = epMemories.filter(m => (m.importance || 0) < 0.3).map(m => m.id);
          if (lowSalienceIds.length > 0) {
            await tx.delete(memories).where(inArray(memories.id, lowSalienceIds));
          }

          await tx.update(episodes)
            .set({ isSynthesized: true })
            .where(eq(episodes.id, ep.id));
        });
      } else {
        await this.db.update(episodes)
          .set({ isSynthesized: true })
          .where(eq(episodes.id, ep.id));
      }

      this.logger.log(`Offline synthesis complete for episode ${ep.id}`);
    }
  }
}
