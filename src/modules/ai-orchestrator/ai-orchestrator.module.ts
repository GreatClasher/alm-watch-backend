import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { AiOrchestratorController } from './ai-orchestrator.controller';

import { EpisodeModule } from '../episode/episode.module';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [EpisodeModule, MemoryModule],
  providers: [AiOrchestratorService],
  controllers: [AiOrchestratorController],
})
export class AiOrchestratorModule {}
