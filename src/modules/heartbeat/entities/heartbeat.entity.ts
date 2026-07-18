import { pgTable, uuid, smallint, boolean, timestamp } from 'drizzle-orm/pg-core';
import { devices } from '../../device/entities/device.entity';

export const heartbeatLogs = pgTable('heartbeat_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  deviceId: uuid('device_id').notNull().references(() => devices.id),
  batteryLevel: smallint('battery_level'),
  bleConnected: boolean('ble_connected').default(false).notNull(),
  flashUsagePercent: smallint('flash_usage_percent').default(0).notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
});

export type HeartbeatLogEntity = typeof heartbeatLogs.$inferSelect;
