import { pgTable, uuid, timestamp, integer, varchar, customType, bigint, unique } from 'drizzle-orm/pg-core';
import { devices } from '../../device/entities/device.entity';
import { sessions } from '../../session/entities/session.entity';

const bytea = customType<{ data: Buffer; driverData: string }>({
  dataType() {
    return 'bytea';
  },
  toDriver(val: Buffer): string {
    return '\\x' + val.toString('hex');
  },
  fromDriver(value: unknown): Buffer {
    if (typeof value === 'string') {
      if (value.startsWith('\\x')) {
        return Buffer.from(value.slice(2), 'hex');
      }
      return Buffer.from(value);
    } else if (Buffer.isBuffer(value)) {
      return value;
    }
    return Buffer.alloc(0);
  },
});

export const audioPackets = pgTable('audio_packets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  deviceId: uuid('device_id').notNull().references(() => devices.id),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  sequenceNo: integer('sequence_no').notNull(),
  payloadType: varchar('payload_type', { length: 20 }).default('AUDIO').notNull(),
  payload: bytea('payload').notNull(),
  checksum: varchar('checksum', { length: 64 }).notNull(),
  clientTimestamp: bigint('client_timestamp', { mode: 'bigint' }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  unq: unique('uq_audio_packets_session_seq').on(t.sessionId, t.sequenceNo),
}));

export type AudioPacketEntity = typeof audioPackets.$inferSelect;
