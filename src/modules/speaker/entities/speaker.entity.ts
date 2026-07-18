import { pgTable, uuid, timestamp, varchar, customType } from 'drizzle-orm/pg-core';

// Define pgvector custom type for Drizzle
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(192)'; // SpeechBrain ECAPA-TDNN usually has 192 dimensions
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .replace('[', '')
      .replace(']', '')
      .split(',')
      .map((v) => parseFloat(v));
  },
});

export const speakers = pgTable('speakers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }),
  voiceEmbedding: vector('voice_embedding'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
