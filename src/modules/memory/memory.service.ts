import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE } from '../../config/database.config';
import { memories } from './entities/memory.entity';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { LlmProvider } from '../llm/llm.provider';
import { SchemaType } from '@google-cloud/vertexai';
import { eq } from 'drizzle-orm';
import { episodes } from '../episode/entities/episode.entity';

@Injectable()
export class MemoryService {
  private logger = new Logger(MemoryService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly llm: LlmProvider
  ) {}

  async createMemory(userId: string, kind: string, summary: string, importance?: number) {
    const [result] = await this.db.insert(memories).values({
      userId, kind, summary, importance
    }).returning();
    return result;
  }

  async extractMemories(episode: { id: string; title: string | null; summary: string | null; timeline: string }, pipelineRunId?: string) {
    const memorySchema = {
      type: SchemaType.OBJECT,
      properties: {
        memories: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              kind: { type: SchemaType.STRING, description: 'episodic, semantic, procedural' },
              summary: { type: SchemaType.STRING, description: 'A self-contained fact or experience memory' },
              importance: { type: SchemaType.NUMBER, description: 'Salience score 0.0 to 1.0, heavily influenced by emotional intensity and surprise/novelty' }
            },
            required: ['kind', 'summary', 'importance']
          }
        }
      },
      required: ['memories']
    };

    const prompt = `Extract discrete, long-term memories from this episode.
Evaluate the 'importance' (Salience) of each memory based on its emotional intensity and surprise factor. High emotional intensity or high novelty means high salience (importance > 0.7). Mundane or routine facts get low salience (< 0.3).
Title: ${episode.title}
Summary: ${episode.summary}
Timeline:
${episode.timeline}`;
    const result = await this.llm.generateStructured<any>(prompt, memorySchema as any);

    const epRecord = await this.db.select({ userId: episodes.userId }).from(episodes).where(eq(episodes.id, episode.id)).limit(1);
    if (!epRecord.length) {
      this.logger.warn(`Episode ${episode.id} not found`);
      return;
    }
    const userId = epRecord[0]!.userId;

    if (result.memories && result.memories.length > 0) {
      const summaries = result.memories.map((m: any) => m.summary);
      const embeddings = await this.llm.generateEmbeddings(summaries);
      
      const insertData = result.memories.map((mem: any, index: number) => ({
        userId,
        kind: mem.kind,
        summary: mem.summary,
        importance: mem.importance,
        strength: 1.0,
        embedding: embeddings[index] || [],
        sourceEpisodeId: episode.id,
        lastUpdatedAt: new Date(),
        pipelineRunId
      }));
      
      if (insertData.length > 0) {
        await this.db.insert(memories).values(insertData);
      }
      this.logger.log(`Extracted ${result.memories.length} memories for episode ${episode.id}`);
    }
  }
}
