import { Controller, Get, Param, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('data/:layer')
  async getLayerData(@Param('layer') layer: string, @Query('limit') limit?: number) {
    return this.dashboardService.getLayerData(layer, undefined, limit ? Number(limit) : 50);
  }
}
