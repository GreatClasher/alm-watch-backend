import { pgTable, uuid, timestamp, varchar, text, real, boolean } from 'drizzle-orm/pg-core';
import { conversations } from '../../conversation/entities/conversation.entity';
import { pipelineRuns } from '../../pipeline/entities/pipeline-run.entity';

export const episodes = pgTable('episodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  title: varchar('title', { length: 500 }),
  summary: text('summary'),
  category: varchar('category', { length: 100 }),
  importance: real('importance'),
  confidence: real('confidence'),
  isSynthesized: boolean('is_synthesized').default(false),
  pipelineRunId: uuid('pipeline_run_id').references(() => pipelineRuns.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
