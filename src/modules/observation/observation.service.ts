import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../config/database.config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { observations } from './entities/observation.entity';

@Injectable()
export class ObservationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase
  ) {}

  async create(data: { userId: string, recordingId: string, type: string, timestampStart: Date, timestampEnd?: Date, payload: any, speakerId?: string, confidence?: number, pipelineRunId?: string, conversationId?: string }) {
    const [result] = await this.db.insert(observations).values({
      userId: data.userId,
      recordingId: data.recordingId,
      type: data.type,
      timestampStart: data.timestampStart,
      timestampEnd: data.timestampEnd,
      payload: data.payload,
      speakerId: data.speakerId,
      confidence: data.confidence,
      pipelineRunId: data.pipelineRunId,
      conversationId: data.conversationId,
    }).returning();
  }
}
