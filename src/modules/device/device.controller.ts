import {
  Body,
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import type { RegisterDeviceResponseDto } from './dto/register-device-response.dto';
import { DeviceStatusDto } from './dto/device-status.dto';
import { RegisterDeviceDto as RegisterDeviceDtoClass } from './dto/register-device.dto';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { DeviceNotFoundError } from '../../common/errors/device-not-found.error';
import { DeviceAlreadyRegisteredError } from '../../common/errors/device-already-registered.error';
import { ConflictException } from '@nestjs/common';

@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) { }

  /**
   * POST /v1/devices/register — no auth required
   * Registers a new device and returns a JWT token.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDeviceDtoClass): Promise<RegisterDeviceResponseDto> {
    try {
      return await this.deviceService.registerDevice(dto);
    } catch (err) {
      if (err instanceof DeviceAlreadyRegisteredError) {
        throw new ConflictException((err as Error).message);
      }
      throw err;
    }
  }

  /**
   * GET /v1/devices
   * Returns a list of devices with generic query parsing.
   */
  @Get()
  async getDevices(
    @Query('where') whereStr: string,
    @Query('order') orderStr: string,
    @Query('select') selectStr: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    let whereObj = undefined;
    let orderObj = undefined;
    let selectObj = undefined;

    if (whereStr) {
      try { whereObj = JSON.parse(whereStr); } catch (e) {}
    }
    if (orderStr) {
      try { orderObj = JSON.parse(orderStr); } catch (e) {}
    }
    if (selectStr) {
      try { selectObj = JSON.parse(selectStr); } catch (e) {}
    }

    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;

    return this.deviceService.getDevices(whereObj, orderObj, selectObj, p, l);
  }

  /**
   * GET /v1/devices/:deviceId — auth required
   * Returns current device status.
   */
  @Get(':deviceId')
  @UseGuards(DeviceAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  async getDevice(@Param('deviceId') deviceId: string): Promise<DeviceStatusDto> {
    try {
      const device = await this.deviceService.findById(deviceId);
      return new DeviceStatusDto(device);
    } catch (err) {
      if (err instanceof DeviceNotFoundError) {
        throw new NotFoundException({
          code: 'DEVICE_NOT_FOUND',
          message: err.message,
        });
      }
      throw err;
    }
  }
}
