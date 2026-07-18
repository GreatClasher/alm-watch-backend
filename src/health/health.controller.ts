import { Controller, Get } from '@nestjs/common';

/**
 * Simple health check endpoint.
 * No auth required — used by load balancers and monitoring.
 */
@Controller('v1/healthz')
export class HealthController {
  private readonly startTime = Date.now();

  @Get()
  check(): { status: string; uptime: number } {
    return {
      status: 'ok',
      uptime: Date.now() - this.startTime,
    };
  }
}
