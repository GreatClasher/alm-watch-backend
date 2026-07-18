import { pgTable, uuid, timestamp, varchar, text, jsonb, real } from 'drizzle-orm/pg-core';
import { transcripts } from '../../transcript/entities/transcript.entity';
import { speakers } from '../../speaker/entities/speaker.entity';

export const utterances = pgTable('utterances', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  transcriptId: uuid('transcript_id')
    .notNull()
    .references(() => transcripts.id, { onDelete: 'cascade' }),
  speakerId: uuid('speaker_id').references(() => speakers.id, { onDelete: 'set null' }),
  speakerLabel: varchar('speaker_label', { length: 50 }), // e.g., "SPEAKER_00" from pyannote
  startTime: real('start_time').notNull(), // in seconds (e.g. 1.25)
  endTime: real('end_time').notNull(), // in seconds (e.g. 4.50)
  text: text('text').notNull(),
  prosody: jsonb('prosody'), // Extracted emotion, pitch, energy (e.g. { emotion: "happy", confidence: 0.9 })
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
