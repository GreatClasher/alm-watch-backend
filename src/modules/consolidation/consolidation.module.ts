import { Module } from '@nestjs/common';
import { ConsolidationService } from './consolidation.service';

@Module({
  providers: [ConsolidationService],
})
export class ConsolidationModule {}
