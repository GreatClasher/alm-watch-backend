import { pgTable, uuid, varchar, timestamp, real, integer } from 'drizzle-orm/pg-core';
import { recordings } from '../../recording/entities/recording.entity';
import { pipelineRuns } from '../../pipeline/entities/pipeline-run.entity';
import { contexts } from '../../context/entities/context.entity';

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  recordingId: uuid('recording_id').notNull().references(() => recordings.id),
  contextId: uuid('context_id').references(() => contexts.id),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  participantCount: integer('participant_count'),
  language: varchar('language', { length: 10 }),
  confidence: real('confidence'),
  pipelineRunId: uuid('pipeline_run_id').references(() => pipelineRuns.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
