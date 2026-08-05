import { Module } from '@nestjs/common';
import { MemoryService } from './memory.service';

import { RecallController } from './recall.controller';

import { QueryModule } from '../query/query.module';

@Module({
  imports: [QueryModule],
  providers: [MemoryService],
  controllers: [RecallController],
  exports: [MemoryService],
})
export class MemoryModule {}
