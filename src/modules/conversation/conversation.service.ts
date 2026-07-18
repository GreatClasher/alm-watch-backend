import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../config/database.config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { conversations } from './entities/conversation.entity';
import { eq } from 'drizzle-orm';

@Injectable()
export class ConversationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase
  ) {}

  async createConversation(userId: string, recordingId: string) {
    return this.db.insert(conversations).values({
      userId,
      recordingId,
      startedAt: new Date(),
      status: 'active',
    }).returning();
  }

  async finalizeConversation(conversationId: string) {
    return this.db.update(conversations)
      .set({
        status: 'finalized',
        endedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId))
      .returning();
  }
}
