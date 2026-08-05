import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../config/database.config';
import { recordings, recordingSegments } from './entities/recording.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq, and, lte, asc } from 'drizzle-orm';
import { observations } from '../observation/entities/observation.entity';
import * as fs from 'fs';

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);

  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  async createRecording(
    userId: string,
    deviceId: string,
    codec: string = 'opus',
    sampleRate: number = 16000,
  ) {
    const [recording] = await this.db
      .insert(recordings)
      .values({
        userId,
        deviceId,
        codec,
        sampleRate,
        startedAt: new Date(),
        status: 'active',
      })
      .returning();

    return recording;
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async finalizeStaleRecordings() {
    const cutoff = new Date(Date.now() - 30000); // 30 seconds ago
    const result = await this.db
      .update(recordings)
      .set({ status: 'finalized' })
      .where(and(eq(recordings.status, 'active'), lte(recordings.endedAt, cutoff)))
      .returning({ id: recordings.id });

    if (result.length > 0) {
      this.logger.log(
        `Finalized ${result.length} recordings: ${result.map((r) => r.id).join(', ')}`,
      );
    }
  }

  async getRecordingAudio(recordingId: string) {
    const recordingRecords = await this.db
      .select()
      .from(recordings)
      .where(eq(recordings.id, recordingId))
      .limit(1);
    if (recordingRecords.length === 0) {
      throw new NotFoundException('Recording not found');
    }

    const { OggOpusWriter } = require('../../common/utils/ogg-muxer.util');
    const oggWriter = new OggOpusWriter(16000, 1);

    const segments = await this.db
      .select()
      .from(recordingSegments)
      .where(eq(recordingSegments.recordingId, recordingId))
      .orderBy(asc(recordingSegments.sequenceNo));

    setImmediate(() => {
      for (const segment of segments) {
        if (segment.storageUri) {
          try {
            const payload = fs.readFileSync(segment.storageUri);
            oggWriter.write({ sequenceNo: segment.sequenceNo, payload });
          } catch (e) {
            this.logger.error(`Failed to read segment ${segment.storageUri}`, e);
          }
        }
      }
      oggWriter.end();
    });

    return oggWriter;
  }

  async getRecordingObservations(recordingId: string) {
    const result = await this.db
      .select()
      .from(observations)
      .where(eq(observations.recordingId, recordingId))
      .orderBy(asc(observations.timestampStart));
    return result;
  }
}
