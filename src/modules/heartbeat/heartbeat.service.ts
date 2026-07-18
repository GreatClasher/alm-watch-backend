import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, lt, and } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Cron, CronExpression } from '@nestjs/schedule';

import { heartbeatLogs } from './entities/heartbeat.entity';
import { devices } from '../device/entities/device.entity';
import { DeviceService } from '../device/device.service';
import { DRIZZLE } from '../../config/database.config';

export interface HeartbeatDto {
  batteryLevel: number;
  bleConnected: boolean;
  flashUsagePercent: number;
}

@Injectable()
export class HeartbeatService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase,
    private readonly deviceService: DeviceService,
    @InjectPinoLogger(HeartbeatService.name)
    private readonly logger: PinoLogger,
  ) {}

  async recordHeartbeat(deviceId: string, userId: string, dto: HeartbeatDto): Promise<void> {
    await this.db.insert(heartbeatLogs).values({
      userId,
      deviceId,
      ...dto,
    });

    await this.deviceService.updateHeartbeat(deviceId, dto);

    // If device was inactive, mark active
    await this.db.update(devices)
      .set({ status: 'active', updatedAt: new Date() })
      .where(and(eq(devices.id, deviceId), eq(devices.status, 'inactive')));
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkStaleDevices() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = await this.db.update(devices)
      .set({ status: 'inactive', updatedAt: new Date() })
      .where(and(
        eq(devices.status, 'active'),
        lt(devices.lastHeartbeatAt, fiveMinutesAgo)
      ));

    if (result.rowCount && result.rowCount > 0) {
      this.logger.info(`Marked ${result.rowCount} devices as inactive`);
    }
  }
}
