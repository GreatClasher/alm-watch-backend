import { Controller, Get, Post, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthMetricDto } from './dto/health-metric.dto';

@Controller('health')
export class HealthMetricsController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /v1/health/metrics?deviceId=xxx&startedAt=ISO&endedAt=ISO&metricType=heart_rate
   * Returns all health metrics for a device in a given time window.
   * Used by the web dashboard to show health data alongside transcript utterances.
   */
  @Get('metrics')
  async getMetrics(
    @Query('deviceId') deviceId: string,
    @Query('startedAt') startedAt: string,
    @Query('endedAt') endedAt: string,
    @Query('metricType') metricType?: string,
  ) {
    return this.healthService.getForWindow(
      deviceId,
      new Date(startedAt),
      new Date(endedAt),
      metricType,
    );
  }

  /**
   * POST /v1/health/sync
   * Instantly sync a batch of metrics from the mobile device to the backend.
   */
  @Post('sync')
  async syncMetrics(@Body() body: { userId: string; deviceId: string; metrics: HealthMetricDto[] }) {
    if (!body.deviceId || !body.metrics || !body.userId) {
      return { status: 'error', message: 'Missing deviceId, userId, or metrics' };
    }
    const savedCount = await this.healthService.saveBatch(body.deviceId, body.userId, body.metrics);
    return { status: 'ok', saved: savedCount };
  }
}

@Controller('system')
export class SystemStatusController {
  @Get('status')
  getStatus() {
    return { pipeline: 'active' };
  }
}

