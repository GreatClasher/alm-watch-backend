import { Exclude, Expose, Transform } from 'class-transformer';
import type { DeviceStatus } from '../entities/device.entity';

@Exclude()
export class DeviceStatusDto {
  @Expose()
  deviceId!: string;

  @Expose()
  deviceSerial!: string;

  @Expose()
  firmwareVersion!: string;

  @Expose()
  model!: string | null;

  @Expose()
  status!: DeviceStatus;

  @Expose()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  lastHeartbeatAt!: string | null;

  @Expose()
  batteryLevel!: number | null;

  @Expose()
  bleConnected!: boolean;

  constructor(partial: Partial<any>) {
    Object.assign(this, partial);
    if (partial.id) {
      this.deviceId = partial.id;
    }
  }
}
