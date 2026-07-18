import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../config/database.config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class ContextService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase
  ) {
    // ponytail: context detection is Phase 2+ work. Stub only.
  }
}
