import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../config/database.config';
import { sensorFrames } from './entities/sensor-frame.entity';

@Injectable()
export class SensorFrameService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  async ingest(userId: string, deviceId: string, type: string, payload: any, recordedAt: Date, recordingId?: string) {
    const [frame] = await this.db.insert(sensorFrames).values({
      userId,
      deviceId,
      type,
      payload,
      recordedAt,
      recordingId
    }).returning();
    
    return frame;
  }
}
