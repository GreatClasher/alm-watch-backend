import { Module } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthMetricsController, SystemStatusController } from './health.controller';

@Module({
  providers: [HealthService],
  controllers: [HealthMetricsController, SystemStatusController],
  exports: [HealthService],
})
export class HealthDataModule {}
