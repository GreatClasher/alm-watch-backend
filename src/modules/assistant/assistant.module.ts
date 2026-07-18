import { Module } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
