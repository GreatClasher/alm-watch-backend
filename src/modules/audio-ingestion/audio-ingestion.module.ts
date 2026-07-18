import { Module } from '@nestjs/common';
import { AudioIngestionService } from './audio-ingestion.service';
import { AudioIngestionGateway } from './audio-ingestion.gateway';
import { HealthModule } from '../health/health.module';
import { AssistantModule } from '../assistant/assistant.module';
import { DatabaseModule } from '../../database/database.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [DatabaseModule, JwtModule.register({}), HealthModule, AssistantModule],
  providers: [AudioIngestionGateway, AudioIngestionService],
  exports: [AudioIngestionService],
})
export class AudioIngestionModule {}
