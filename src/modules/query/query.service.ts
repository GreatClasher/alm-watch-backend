import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../config/database.config';
import { LlmProvider } from '../llm/llm.provider';
import { memories } from '../memory/entities/memory.entity';
import { sql, desc, eq, inArray, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { SchemaType } from '@google-cloud/vertexai';
@Injectable()
export class QueryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<any>,
    private readonly llm: LlmProvider,
  ) {}

  async ask(userQuery: string, userId: string) {
    const extractionSchema = {
      type: SchemaType.OBJECT,
      properties: {
        searchTerms: { type: SchemaType.STRING, description: 'The core semantic concepts to search for' },
        startDate: { type: SchemaType.STRING, description: 'ISO 8601 start date if the query implies a time bound' },
        endDate: { type: SchemaType.STRING, description: 'ISO 8601 end date if the query implies a time bound' }
      },
      required: ['searchTerms']
    };

    const extractionPrompt = `Extract search terms and an optional date range from the following user query. Current time is: ${new Date().toISOString()}.\nQuery: "${userQuery}"`;
    const extraction = (await this.llm.generateStructured(extractionPrompt, extractionSchema)) as { searchTerms: string; startDate?: string; endDate?: string; };

    // 2. Vector Retrieval
    const queryEmbedding = await this.llm.generateEmbedding(extraction.searchTerms);
    const vectorQuery = `[${queryEmbedding.join(',')}]`;

    // 2a. Fetch Memories
    const vectorDistance = sql`(${memories.embedding} <=> ${vectorQuery}::vector)`;
    // Combine distance with utility scores (lower is better for distance)
    const memoryUtilityOrder = sql`${vectorDistance} - (COALESCE(${memories.strength}, 1.0) * 0.1) - (COALESCE(${memories.importance}, 0.5) * 0.1)`;
    
    let memoryConditions: any = eq(memories.userId, userId);
    
    const safeDate = (dateStr?: string) => {
      if (!dateStr) return null;
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        return d;
      } catch (e) {
        return null;
      }
    };

    const parsedStart = safeDate(extraction.startDate);
    const parsedEnd = safeDate(extraction.endDate);

    if (parsedStart && parsedEnd) {
      memoryConditions = and(
        eq(memories.userId, userId),
        gte(memories.createdAt, parsedStart),
        lte(memories.createdAt, parsedEnd)
      );
    } else if (parsedStart) {
      memoryConditions = and(eq(memories.userId, userId), gte(memories.createdAt, parsedStart));
    } else if (parsedEnd) {
      memoryConditions = and(eq(memories.userId, userId), lte(memories.createdAt, parsedEnd));
    }

    const retrievedMemories = await this.db.select()
      .from(memories)
      .where(memoryConditions)
      .orderBy(memoryUtilityOrder)
      .limit(15);

    // 3. Context Formatting
    let contextText = '';
    const memoryIdMap = new Map<number, string>(); // Maps integer index to UUID
    
    if (retrievedMemories.length > 0) {
      contextText += '--- MEMORIES ---\n';
      let memIdx = 1;
      for (const m of retrievedMemories) {
        memoryIdMap.set(memIdx, m.id);
        contextText += `[Memory ${memIdx}] (${m.createdAt.toISOString()}): ${m.summary}\n`;
        memIdx++;
      }
    }



    // 4. Answer Generation
    const answerSchema = {
      type: SchemaType.OBJECT,
      properties: {
        answer: { type: SchemaType.STRING, description: 'The answer to the user query based on the context' },
        usedMemoryIds: { 
          type: SchemaType.ARRAY, 
          description: 'List of integer Memory IDs (e.g. 1, 2) that were actually useful in answering the query',
          items: { type: SchemaType.INTEGER }
        }
      },
      required: ['answer', 'usedMemoryIds']
    };

    const prompt = `You are a memory retrieval assistant. Answer the user's query using ONLY the provided context.
If you cannot answer the query from the context, say "I don't remember that."
Provide the answer, and explicitly list the integer Memory IDs (e.g. 1, 2) that you used.

User Query: "${userQuery}"

Context:
${contextText}
`;

    const result = (await this.llm.generateStructured(prompt, answerSchema)) as { answer: string; usedMemoryIds: number[]; };

    // 5. Memory Reinforcement
    if (result.usedMemoryIds.length > 0) {
      // Map integers back to UUIDs
      const validUuids = result.usedMemoryIds
        .map(idx => memoryIdMap.get(idx))
        .filter((id): id is string => id !== undefined);

      if (validUuids.length > 0) {
        await this.db.update(memories)
          .set({ 
            lastRecalledAt: new Date(),
            recallCount: sql`${memories.recallCount} + 1`
          })
          .where(inArray(memories.id, validUuids));
      }
    }

    return {
      answer: result.answer,
      usedMemoryIds: result.usedMemoryIds,
    };
  }
}
