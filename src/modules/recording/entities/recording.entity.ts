import { pgTable, uuid, timestamp, varchar, integer, real, text, bigint, unique } from 'drizzle-orm/pg-core';
import { devices } from '../../device/entities/device.entity';

export const recordings = pgTable('recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  codec: varchar('codec', { length: 20 }).default('opus').notNull(),
  sampleRate: integer('sample_rate').default(16000).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const recordingSegments = pgTable('recording_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  recordingId: uuid('recording_id').references(() => recordings.id).notNull(),
  sequenceNo: integer('sequence_no').notNull(),
  startTime: real('start_time').notNull(),
  endTime: real('end_time').notNull(),
  storageUri: text('storage_uri').notNull(),
  checksum: varchar('checksum', { length: 64 }),
  duration: real('duration').notNull(),
  clientTimestamp: bigint('client_timestamp', { mode: 'number' }),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.recordingId, table.sequenceNo)
}));
