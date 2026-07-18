import { IsString, MaxLength } from 'class-validator';

/**
 * DTO for POST /v1/devices/register
 * All fields required, validated by class-validator decorators.
 */
export class RegisterDeviceDto {
  @IsString()
  @MaxLength(64)
  readonly deviceSerial!: string;

  @IsString()
  @MaxLength(20)
  readonly firmwareVersion!: string;

  @IsString()
  @MaxLength(64)
  readonly model!: string;

  @IsString()
  readonly userId!: string;
}
