import { Module } from '@nestjs/common';
import { HeartbeatService } from './heartbeat.service';
import { HeartbeatController } from './heartbeat.controller';
import { DeviceModule } from '../device/device.module';

@Module({
  imports: [DeviceModule],
  providers: [HeartbeatService],
  controllers: [HeartbeatController],
  exports: [HeartbeatService],
})
export class HeartbeatModule {}
