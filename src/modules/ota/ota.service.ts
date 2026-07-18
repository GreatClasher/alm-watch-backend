import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import { firmwareVersions } from './entities/ota.entity';
import { DRIZZLE } from '../../config/database.config';

@Injectable()
export class OtaService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase,
  ) {}

  async checkUpdate(currentVersion: string, targetModel: string) {
    const records = await this.db.select().from(firmwareVersions)
      .where(and(eq(firmwareVersions.targetModel, targetModel), eq(firmwareVersions.isActive, true)))
      .orderBy(desc(firmwareVersions.createdAt))
      .limit(1);

    if (records.length === 0) {
      return { hasUpdate: false };
    }
    
    const latest = records[0]!;

    // Simplistic version check: if versions differ, provide update
    if (latest.version !== currentVersion) {
      return {
        hasUpdate: true,
        update: {
          version: latest.version,
          binaryUrl: latest.binaryUrl,
          checksumSha256: latest.checksumSha256,
          releaseNotes: latest.releaseNotes,
        },
      };
    }

    return { hasUpdate: false };
  }
}
