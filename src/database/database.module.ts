import { Global, Module } from '@nestjs/common';
import { databaseProvider, DRIZZLE } from '../config/database.config';

@Global()
@Module({
  providers: [databaseProvider],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
