import { ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { AudioPacketDto } from './audio-packet.dto';

export class AudioPacketBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AudioPacketDto)
  packets!: AudioPacketDto[];
}
