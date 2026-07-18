import { pgTable, uuid, timestamp, varchar, jsonb, text } from 'drizzle-orm/pg-core';
import { recordings } from '../../recording/entities/recording.entity';

export const pipelineRuns = pgTable('pipeline_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  recordingId: uuid('recording_id').references(() => recordings.id).notNull(),
  targetLayer: varchar('target_layer', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  modelVersions: jsonb('model_versions').notNull(),
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
