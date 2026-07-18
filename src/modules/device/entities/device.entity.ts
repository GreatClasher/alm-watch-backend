import { pgTable, uuid, varchar, timestamp, smallint, boolean } from 'drizzle-orm/pg-core';

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  deviceSerial: varchar('device_serial', { length: 64 }).notNull().unique(),
  model: varchar('model', { length: 64 }),
  firmwareVersion: varchar('firmware_version', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
  batteryLevel: smallint('battery_level'),
  bleConnected: boolean('ble_connected').default(false).notNull(),
  flashUsagePercent: smallint('flash_usage_percent').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type DeviceStatus = 'active' | 'inactive' | 'suspended' | 'stale';
export type DeviceEntity = typeof devices.$inferSelect;
