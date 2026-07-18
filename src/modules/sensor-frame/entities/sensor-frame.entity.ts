import { pgTable, uuid, timestamp, varchar, jsonb, index } from 'drizzle-orm/pg-core';
import { devices } from '../../device/entities/device.entity';
import { recordings } from '../../recording/entities/recording.entity';

export const sensorFrames = pgTable('sensor_frames', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  recordingId: uuid('recording_id').references(() => recordings.id),
  type: varchar('type', { length: 50 }).notNull(),
  payload: jsonb('payload').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  deviceTimeIdx: index('sensor_frames_device_recorded_at_idx').on(table.deviceId, table.recordedAt),
  typeIdx: index('sensor_frames_type_idx').on(table.type)
}));
