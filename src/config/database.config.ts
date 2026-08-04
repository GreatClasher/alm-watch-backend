import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

export const DRIZZLE = 'DRIZZLE';

export const databaseProvider = {
  provide: DRIZZLE,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const connectionString = configService.get<string>('DATABASE_URL');
    const pool = new Pool({
      connectionString,
      ssl:
        configService.get<string>('NODE_ENV') === 'production'
          ? { rejectUnauthorized: true }
          : false,
    });
    return drizzle(pool, { logger: false });
  },
};
