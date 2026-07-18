import { pgTable, uuid, varchar, timestamp, real, jsonb } from 'drizzle-orm/pg-core';
import { recordings } from '../../recording/entities/recording.entity';
import { pipelineRuns } from '../../pipeline/entities/pipeline-run.entity';

export const contexts = pgTable('contexts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  recordingId: uuid('recording_id').notNull().references(() => recordings.id),
  type: varchar('type', { length: 50 }).notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  confidence: real('confidence'),
  source: varchar('source', { length: 50 }),
  payload: jsonb('payload'),
  pipelineRunId: uuid('pipeline_run_id').references(() => pipelineRuns.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
