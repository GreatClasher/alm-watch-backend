import { Module } from '@nestjs/common';
import { SensorFrameService } from './sensor-frame.service';

@Module({
  providers: [SensorFrameService],
  exports: [SensorFrameService]
})
export class SensorFrameModule {}
