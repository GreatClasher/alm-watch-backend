import { Module } from '@nestjs/common';
import { MemoryService } from './memory.service';

import { RecallController } from './recall.controller';

@Module({
  providers: [MemoryService],
  controllers: [RecallController],
  exports: [MemoryService],
})
export class MemoryModule {}
