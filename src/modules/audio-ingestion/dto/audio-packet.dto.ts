import { IsString, IsNumber, IsUUID, IsBase64, IsIn } from 'class-validator';

export class AudioPacketDto {
  @IsUUID()
  deviceId!: string;

  @IsUUID()
  sessionId!: string;

  @IsNumber()
  sequenceNo!: number;

  @IsNumber()
  timestamp!: number;

  // ponytail: all payload types from docs/10-ble-protocol.md §Payload Types, plus ACTIVE_QUERY
  @IsIn(['AUDIO', 'HEARTBEAT', 'CONTROL', 'DIAGNOSTIC', 'ACTIVE_QUERY'])
  payloadType!: string;

  @IsBase64()
  payload!: string;

  @IsString()
  checksum!: string;
}
