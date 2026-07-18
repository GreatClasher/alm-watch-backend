import { pgTable, uuid, varchar, boolean, text, timestamp } from 'drizzle-orm/pg-core';

export const firmwareVersions = pgTable('firmware_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  version: varchar('version', { length: 50 }).notNull(),
  targetModel: varchar('target_model', { length: 64 }).notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  binaryUrl: text('binary_url').notNull(),
  checksumSha256: varchar('checksum_sha256', { length: 64 }).notNull(),
  releaseNotes: text('release_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type FirmwareVersionEntity = typeof firmwareVersions.$inferSelect;
