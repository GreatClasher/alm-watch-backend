import { Injectable, Inject, Logger } from '@nestjs/common';
import { LlmProvider } from '../llm/llm.provider';
import { DRIZZLE } from '../../config/database.config';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { memories } from '../memory/entities/memory.entity';
import { recordings, recordingSegments } from '../recording/entities/recording.entity';
import { observations } from '../observation/entities/observation.entity';
import { cosineDistance, desc, sql, eq } from 'drizzle-orm';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly llm: LlmProvider,
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
  ) {}

  async processActiveQuery(deviceId: string, userId: string, payloadBase64: string, sessionId: string, sequenceNo: number): Promise<string> {
    this.logger.log(`Processing active query for session ${sessionId} sequence ${sequenceNo}`);
    
    // 1. Transcribe & Infer Intent using Gemini Flash with Audio
    // For raw Opus packets (which are 16kbps typically from the watch), Gemini can often infer directly if packaged properly, 
    // but we can pass the base64 and specify mimeType as audio/ogg (assuming the payload represents an ogg stream or raw opus we can try).
    // In a production system, we'd wrap raw Opus in an Ogg container here if needed.
    const systemPrompt = `You are Jabbel, an AI life assistant. The user is asking a question via a smartwatch. 
Your memory pipeline will provide context. Transcribe the audio, analyze it, and formulate a response.`;
    
    // First, let's transcribe the audio directly
    const transcriptionResponse = await this.llm.generateFromAudio(
      payloadBase64, 
      'audio/ogg', // Sending as ogg, but might need conversion in reality
      'Transcribe the user request exactly. Return only the transcription.',
    );
    
    const query = transcriptionResponse.trim();
    this.logger.log(`Transcribed Query: "${query}"`);

    // 2. RAG: Search past memories
    const embedding = await this.llm.generateEmbedding(query);
    const similarMemories = await this.db.select({
      id: memories.id,
      summary: memories.summary,
      kind: memories.kind,
      distance: cosineDistance(memories.embedding, embedding)
    })
    .from(memories)
    .where(eq(memories.userId, userId))
    .orderBy(cosineDistance(memories.embedding, embedding))
    .limit(5);

    const memoryContext = similarMemories.map(m => `- ${m.summary}`).join('\n');

    // 3. Generate Answer
    const answerPrompt = `Context from user's memory:
${memoryContext}

User Query: "${query}"

Answer the user directly and concisely as Jabbel.`;

    const answer = await this.llm.generateText(answerPrompt, systemPrompt);
    this.logger.log(`Jabbel Answer: "${answer}"`);

    // 4. Slow Path Integration: Save as Observation in Layer 0
    // We assume the recording exists (the gateway/ingestion created it).
    // Let's create an observation directly so the memory system remembers this interaction.
    try {
      await this.db.insert(observations).values({
        userId,
        recordingId: sessionId,
        type: 'interactive_query',
        payload: {
          query,
          answer,
          model: 'gemini-3.5-flash'
        },
        timestampStart: new Date(),
        timestampEnd: new Date()
      });
    } catch (e) {
      this.logger.error('Failed to insert observation for interactive query', e);
    }

    return answer;
  }
}
