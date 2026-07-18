import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { recordings, recordingSegments } from '../recording/entities/recording.entity';
import { AudioPacketDto } from './dto/audio-packet.dto';
import { DRIZZLE } from '../../config/database.config';
import { ChecksumUtil } from './utils/checksum.util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class AudioIngestionService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase,
    @InjectPinoLogger(AudioIngestionService.name)
    private readonly logger: PinoLogger,
  ) {}

  async ingestPacket(deviceId: string, userId: string, packet: AudioPacketDto): Promise<string> {
    const payloadBuf = Buffer.from(packet.payload, 'base64');
    // ponytail: checksum is transmitted as 8-char hex; .toString(16) matches mobile format
    const computed = ChecksumUtil.calculateCrc32(payloadBuf).toString(16).padStart(8, '0');
    if (computed !== packet.checksum) throw new Error('Invalid checksum');

    const recordingRecords = await this.db.select().from(recordings).where(eq(recordings.id, packet.sessionId)).limit(1);

    if (recordingRecords.length === 0) {
      await this.db.insert(recordings).values({
        userId,
        id: packet.sessionId,
        deviceId,
        startedAt: new Date(packet.timestamp),
        status: 'active',
      }).onConflictDoNothing();
      this.logger.info({ recordingId: packet.sessionId, deviceId }, 'Created new recording');
    }

    // Save payload to disk (Lazy MVP approach)
    const tempDir = path.join(os.tmpdir(), 'alm_segments');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const storageUri = path.join(tempDir, `${packet.sessionId}_${packet.sequenceNo}.raw`);
    fs.writeFileSync(storageUri, payloadBuf);

    // Each packet is typically 80ms for Opus framing
    const duration = 0.08; 
    const startTime = packet.sequenceNo * duration;

    const inserted = await this.db.insert(recordingSegments).values({
      userId,
      recordingId: packet.sessionId,
      sequenceNo: packet.sequenceNo,
      startTime: startTime,
      endTime: startTime + duration,
      storageUri: storageUri,
      checksum: packet.checksum,
      duration: duration,
      clientTimestamp: packet.timestamp,
    }).onConflictDoNothing().returning({ id: recordingSegments.id });

    // On duplicate (idempotent insert), fall back to a deterministic placeholder
    const packetId = inserted[0]?.id ?? `${packet.sessionId}:${packet.sequenceNo}`;

    if (inserted[0]?.id) {
      await this.db.update(recordings)
        .set({ 
          endedAt: new Date(packet.timestamp)
        })
        .where(eq(recordings.id, packet.sessionId));
    }

    return packetId;
  }
}
