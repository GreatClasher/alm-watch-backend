import { pgTable, uuid, timestamp, varchar, text } from 'drizzle-orm/pg-core';
import { sessions } from '../../session/entities/session.entity';

export const transcripts = pgTable('transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull().default('processing'), // processing, completed, failed
  fullText: text('full_text'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
