import { pgTable, uuid, timestamp, varchar, jsonb, real } from 'drizzle-orm/pg-core';
import { episodes } from './episode.entity';

export const episodeArtifacts = pgTable('episode_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  episodeId: uuid('episode_id').references(() => episodes.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  payload: jsonb('payload').notNull(),
  importance: real('importance'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
