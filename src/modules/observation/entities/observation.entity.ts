import { pgTable, uuid, varchar, timestamp, real, jsonb, index } from 'drizzle-orm/pg-core';
import { recordings } from '../../recording/entities/recording.entity';
import { pipelineRuns } from '../../pipeline/entities/pipeline-run.entity';
import { speakers } from '../../speaker/entities/speaker.entity';
import { conversations } from '../../conversation/entities/conversation.entity';

export const observations = pgTable('observations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  recordingId: uuid('recording_id').notNull().references(() => recordings.id),
  conversationId: uuid('conversation_id').references(() => conversations.id),
  type: varchar('type', { length: 50 }).notNull(),
  timestampStart: timestamp('timestamp_start', { withTimezone: true }).notNull(),
  timestampEnd: timestamp('timestamp_end', { withTimezone: true }),
  payload: jsonb('payload').notNull(),
  speakerId: uuid('speaker_id').references(() => speakers.id),
  confidence: real('confidence'),
  pipelineRunId: uuid('pipeline_run_id').references(() => pipelineRuns.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    recordingIdTimestampStartIndex: index('observations_recording_id_timestamp_start_idx').on(table.recordingId, table.timestampStart),
    typeIndex: index('observations_type_idx').on(table.type),
  };
});
