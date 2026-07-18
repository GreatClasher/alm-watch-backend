import { Module } from '@nestjs/common';
import { OtaService } from './ota.service';
import { OtaController } from './ota.controller';
import { DeviceModule } from '../device/device.module';

@Module({
  imports: [DeviceModule],
  providers: [OtaService],
  controllers: [OtaController],
  exports: [OtaService],
})
export class OtaModule {}
