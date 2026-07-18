import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../config/database.config';
import { healthMetrics } from './entities/health-metric.entity';
import { HealthMetricDto } from './dto/health-metric.dto';
import { and, between, eq } from 'drizzle-orm';

@Injectable()
export class HealthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<any>,
    @InjectPinoLogger(HealthService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Bulk-insert a batch of health metrics for a specific device.
   * Duplicate-safe: uses ON CONFLICT DO NOTHING on (deviceId + metricType + recordedAt).
   */
  async saveBatch(deviceId: string, userId: string, metrics: HealthMetricDto[]): Promise<number> {
    if (!metrics.length) return 0;

    const rows = metrics.map((m) => ({
      userId,
      deviceId,
      metricType: m.metricType,
      value: m.value,
      recordedAt: new Date(m.recordedAt),
    }));

    await this.db
      .insert(healthMetrics)
      .values(rows)
      .onConflictDoNothing(); // safe to re-send same batch

    this.logger.info({ deviceId, count: rows.length }, 'Health metrics saved');
    return rows.length;
  }

  /**
   * Query health metrics for a device within a time window.
   * Used by the web API to display metrics alongside transcripts.
   */
  async getForWindow(
    deviceId: string,
    startedAt: Date,
    endedAt: Date,
    metricType?: string,
  ): Promise<typeof healthMetrics.$inferSelect[]> {
    const conditions = [
      eq(healthMetrics.deviceId, deviceId),
      between(healthMetrics.recordedAt, startedAt, endedAt),
    ];
    if (metricType) conditions.push(eq(healthMetrics.metricType, metricType));

    return this.db
      .select()
      .from(healthMetrics)
      .where(and(...conditions))
      .orderBy(healthMetrics.recordedAt);
  }
}
