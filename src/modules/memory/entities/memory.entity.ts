import { pgTable, uuid, timestamp, varchar, text, real, customType, integer, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { episodes } from '../../episode/entities/episode.entity';
import { pipelineRuns } from '../../pipeline/entities/pipeline-run.entity';

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() { return 'vector(384)'; },
  toDriver(value: number[]): string { return `[${value.join(',')}]`; },
  fromDriver(value: string): number[] {
    return value.replace('[', '').replace(']', '').split(',').map((v) => parseFloat(v));
  },
});

export const memories = pgTable('memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  kind: varchar('kind', { length: 50 }).notNull(),
  summary: text('summary').notNull(),
  importance: real('importance'),
  strength: real('strength').default(1.0).notNull(),
  embedding: vector('embedding'),
  sourceEpisodeId: uuid('source_episode_id').references(() => episodes.id),
  lastRecalledAt: timestamp('last_recalled_at', { withTimezone: true }),
  recallCount: integer('recall_count').default(0),
  lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  pipelineRunId: uuid('pipeline_run_id').references(() => pipelineRuns.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  embeddingIndex: index('memories_embedding_idx').using('hnsw', sql`${table.embedding} vector_cosine_ops`),
}));
