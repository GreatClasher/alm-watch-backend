import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE } from '../../config/database.config';
import { episodes } from './entities/episode.entity';
import { episodeArtifacts } from './entities/episode-artifact.entity';
import { observations } from '../observation/entities/observation.entity';
import { conversations } from '../conversation/entities/conversation.entity';
import { speakers } from '../speaker/entities/speaker.entity';
import { LlmProvider } from '../llm/llm.provider';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, asc } from 'drizzle-orm';
import { SchemaType } from '@google/generative-ai';

export interface GeneratedEpisode {
  id: string;
  title: string | null;
  summary: string | null;
  timeline: string;
}

@Injectable()
export class EpisodeService {
  private logger = new Logger(EpisodeService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly llm: LlmProvider
  ) {}

  async createEpisode(conversationId: string, title: string, summary: string, category?: string, importance?: number) {
    const conv = await this.db.select({ userId: conversations.userId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    if (!conv.length) throw new Error('Conversation not found');
    const [result] = await this.db.insert(episodes).values({
      userId: conv[0]!.userId, conversationId, title, summary, category, importance
    }).returning();
    return result;
  }

  async generateEpisode(conversationId: string, pipelineRunId?: string): Promise<GeneratedEpisode | null> {
    const obsList = await this.db.select({
      id: observations.id,
      timestampStart: observations.timestampStart,
      payload: observations.payload,
      speakerName: speakers.name,
    })
    .from(observations)
    .leftJoin(speakers, eq(observations.speakerId, speakers.id))
    .where(eq(observations.conversationId, conversationId))
    .orderBy(asc(observations.timestampStart));

    const conv = await this.db.select({ userId: conversations.userId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    if (!conv.length) {
      this.logger.warn(`Conversation ${conversationId} not found`);
      return null;
    }
    const userId = conv[0]!.userId;

    if (obsList.length === 0) {
      this.logger.warn(`No observations found for conversation ${conversationId}`);
      return null;
    }

    const timeline = obsList.map(obs => {
      const p = obs.payload as any;
      const speaker = obs.speakerName || p.speaker_label || 'UNKNOWN';
      return `[${obs.timestampStart.toISOString()}] ${speaker} (${p.emotion || 'neutral'}): ${p.text || ''}`;
    }).join('\n');

    const episodeSchema = {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: 'A short, descriptive title for the conversation.' },
        summary: { type: SchemaType.STRING, description: 'A detailed summary of the conversation.' },
        category: { type: SchemaType.STRING, description: 'Category e.g., meeting, personal, brainstorm, random.' },
        importance: { type: SchemaType.NUMBER, description: 'Importance from 0.0 to 1.0.' },
        artifacts: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              type: { type: SchemaType.STRING, description: 'Type: action_item, decision, topic, question.' },
              payload: { type: SchemaType.STRING, description: 'JSON string payload describing the artifact (e.g. \\"{\\\\\\"text\\\\\\": \\\\\\"do this\\\\\\"}").' }
            },
            required: ['type', 'payload']
          }
        }
      },
      required: ['title', 'summary', 'category', 'importance', 'artifacts']
    };

    const prompt = `Analyze this conversation timeline and extract the episode metadata and artifacts.\n\nTimeline:\n${timeline}`;
    
    const result = await this.llm.generateStructured<any>(prompt, episodeSchema as any);

    const [episode] = await this.db.insert(episodes).values({
      userId,
      conversationId,
      title: result.title,
      summary: result.summary,
      category: result.category,
      importance: result.importance,
      pipelineRunId
    }).returning();

    if (result.artifacts && result.artifacts.length > 0) {
      const artifactValues = result.artifacts.map((a: any) => ({
        userId,
        episodeId: episode!.id,
        type: a.type,
        payload: a.payload,
      }));
      await this.db.insert(episodeArtifacts).values(artifactValues);
    }

    this.logger.log(`Generated episode: ${episode!.id} - ${episode!.title}`);
    return {
      id: episode!.id,
      title: episode!.title,
      summary: episode!.summary,
      timeline
    };
  }
}
