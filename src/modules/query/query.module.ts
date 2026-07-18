import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [QueryController],
  providers: [QueryService],
  exports: [QueryService],
})
export class QueryModule {}
