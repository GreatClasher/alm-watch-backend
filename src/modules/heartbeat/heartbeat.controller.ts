import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { HeartbeatService } from './heartbeat.service';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { DeviceId } from '../../common/decorators/device-id.decorator';
import { UserId } from '../../common/decorators/user-id.decorator';
import { IsNumber, IsBoolean, IsOptional, IsInt, Min, Max } from 'class-validator';

export class HeartbeatDtoClass {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  batteryLevel!: number;

  @IsBoolean()
  bleConnected!: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  flashUsagePercent!: number;
}

@Controller('v1/devices')
@UseGuards(DeviceAuthGuard)
export class HeartbeatController {
  constructor(private readonly heartbeatService: HeartbeatService) {}

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(
    @UserId() userId: string,
    @DeviceId() deviceId: string,
    @Body() dto: HeartbeatDtoClass,
  ) {
    await this.heartbeatService.recordHeartbeat(deviceId, userId, dto);
    return { status: 'ok' };
  }
}
