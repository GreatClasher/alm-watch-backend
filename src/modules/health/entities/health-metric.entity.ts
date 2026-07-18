import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { devices } from '../../device/entities/device.entity';

export const healthMetrics = pgTable(
  'health_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    metricType: varchar('metric_type', { length: 50 }).notNull(),
    // e.g. 'heart_rate' | 'steps' | 'sleep' | 'spo2' | 'stress_score'
    value: jsonb('value').notNull(),
    // heart_rate: { bpm: 85 }
    // steps:      { count: 1200 }
    // sleep:      { stage: 'REM', durationSeconds: 3600 }
    // spo2:       { percentage: 97.5 }
    // stress:     { score: 42 }
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    // Exact timestamp from the watch sensor (sent from phone)
    syncedAt: timestamp('synced_at').defaultNow().notNull(),
    // When the server received it
  },
  (table) => [
    // Composite index: fast time-range queries per device
    // e.g. "heart rate for device X between 14:00 and 15:00"
    index('health_metrics_device_time_idx').on(table.deviceId, table.recordedAt),
    index('health_metrics_type_idx').on(table.metricType),
  ],
);

export type HealthMetricEntity = typeof healthMetrics.$inferSelect;
export type HealthMetricType = 'heart_rate' | 'steps' | 'sleep' | 'spo2' | 'stress_score';
