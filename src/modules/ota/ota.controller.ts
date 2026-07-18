import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { OtaService } from './ota.service';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { DeviceService } from '../device/device.service';
import { DeviceId } from '../../common/decorators/device-id.decorator';

@Controller('v1/ota')
@UseGuards(DeviceAuthGuard)
export class OtaController {
  constructor(
    private readonly otaService: OtaService,
    private readonly deviceService: DeviceService,
  ) {}

  @Get('check')
  async checkUpdate(
    @DeviceId() deviceId: string,
    @Query('currentVersion') currentVersion?: string,
  ) {
    if (!currentVersion) {
      throw new BadRequestException('currentVersion query parameter is required');
    }

    const device = await this.deviceService.findById(deviceId);
    return this.otaService.checkUpdate(currentVersion, device.model || 'default');
  }
}
