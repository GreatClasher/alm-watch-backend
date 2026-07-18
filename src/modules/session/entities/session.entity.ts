import { pgTable, uuid, timestamp, integer } from 'drizzle-orm/pg-core';
import { devices } from '../../device/entities/device.entity';

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  deviceId: uuid('device_id').notNull().references(() => devices.id),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  packetCount: integer('packet_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type SessionEntity = typeof sessions.$inferSelect;
