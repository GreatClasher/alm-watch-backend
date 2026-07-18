import { Controller, Get, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, count } from 'drizzle-orm';
import { DRIZZLE } from '../../config/database.config';
import { devices } from '../device/entities/device.entity';
import { sessions } from '../session/entities/session.entity';
import { audioPackets } from '../audio-ingestion/entities/audio-ingestion.entity';

@Controller('metrics')
export class MetricsController {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase,
  ) {}

  @Get()
  async getMetrics() {
    const devicesQuery = await this.db.select({ count: count() }).from(devices);
    const activeDevicesQuery = await this.db.select({ count: count() }).from(devices).where(eq(devices.status, 'active'));
    const sessionsQuery = await this.db.select({ count: count() }).from(sessions);
    const packetsQuery = await this.db.select({ count: count() }).from(audioPackets);

    const devicesCount = devicesQuery[0]!.count;
    const activeDevicesCount = activeDevicesQuery[0]!.count;
    const sessionsCount = sessionsQuery[0]!.count;
    const packetsCount = packetsQuery[0]!.count;

    return `
# HELP jabbelpin_devices_total Total registered devices
# TYPE jabbelpin_devices_total gauge
jabbelpin_devices_total ${devicesCount}

# HELP jabbelpin_devices_active Total active devices
# TYPE jabbelpin_devices_active gauge
jabbelpin_devices_active ${activeDevicesCount}

# HELP jabbelpin_sessions_total Total recorded sessions
# TYPE jabbelpin_sessions_total counter
jabbelpin_sessions_total ${sessionsCount}

# HELP jabbelpin_packets_total Total audio packets ingested
# TYPE jabbelpin_packets_total counter
jabbelpin_packets_total ${packetsCount}
    `.trim();
  }
}
