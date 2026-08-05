import { Injectable, Inject, Logger } from '@nestjs/common';
import { LlmProvider } from '../llm/llm.provider';
import { DRIZZLE } from '../../config/database.config';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { memories } from '../memory/entities/memory.entity';
import { recordings, recordingSegments } from '../recording/entities/recording.entity';
import { observations } from '../observation/entities/observation.entity';
import { cosineDistance, desc, sql, eq, asc } from 'drizzle-orm';
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

  async processActiveQuery(deviceId: string, userId: string, sessionId: string): Promise<{ answer: string, query: string }> {
    this.logger.log(`Processing active query for session ${sessionId}`);
    
    // Fetch all packets
    const segments = await this.db.select().from(recordingSegments)
      .where(eq(recordingSegments.recordingId, sessionId))
      .orderBy(asc(recordingSegments.sequenceNo));

    const { OggOpusWriter } = require('../../common/utils/ogg-muxer.util');
    const oggWriter = new OggOpusWriter(16000, 1);
    
    const chunks: Buffer[] = [];
    oggWriter.on('data', (chunk: Buffer) => chunks.push(chunk));

    const muxPromise = new Promise<Buffer>((resolve, reject) => {
      oggWriter.on('end', () => resolve(Buffer.concat(chunks)));
      oggWriter.on('error', reject);
    });

    for (const segment of segments) {
      if (segment.storageUri && fs.existsSync(segment.storageUri)) {
        try {
          const payload = fs.readFileSync(segment.storageUri);
          oggWriter.write(payload);
        } catch (e) {
          this.logger.error(`Failed to read segment ${segment.storageUri}`, e);
        }
      }
    }
    oggWriter.end();

    const oggBuffer = await muxPromise;
    const cleanBase64 = oggBuffer.toString('base64');
    
    const systemPrompt = `You are Jabbel, an AI life assistant. The user is asking a question via a smartwatch. 
Your memory pipeline will provide context to help you answer.`;
    
    // First, let's transcribe the audio directly
    const transcriptionResponse = await this.llm.generateFromAudio(
      cleanBase64, 
      'audio/ogg', // Muxed to ogg
      'Transcribe the user request exactly. Return only the transcription.',
    );
    
    const query = transcriptionResponse.trim();
    this.logger.log(`Transcribed Query: "${query}"`);

    // 2. RAG: Search past memories
    this.logger.log(`Generating embedding for query...`);
    const embedding = await this.llm.generateEmbedding(query);
    this.logger.log(`Searching memory database for similar contexts...`);
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
    this.logger.log(`Found ${similarMemories.length} semantic matches in memory.`);

    // 3. Generate Answer
    this.logger.log(`Generating final Jabbel answer...`);
    const answerPrompt = `Context from user's memory:
${memoryContext}

User Query: "${query}"

Answer the user directly and concisely as Jabbel. 
If the user asks about their own life or past events, you MUST rely exclusively on the memory context above. If the context doesn't contain the answer, politely say you don't remember. You may still answer general knowledge questions normally.`;

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

    return { answer, query };
  }
}
