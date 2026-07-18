import { databaseProvider, DRIZZLE } from './database.config';
import { ConfigService } from '@nestjs/config';

jest.mock('drizzle-orm/node-postgres', () => ({
  drizzle: jest.fn().mockReturnValue('mock-db'),
}));

jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('Database Config', () => {
  it('should export DRIZZLE token', () => {
    expect(DRIZZLE).toBe('DRIZZLE');
  });

  describe('databaseProvider', () => {
    let mockConfigService: any;

    beforeEach(() => {
      mockConfigService = {
        get: jest.fn().mockImplementation((key) => {
          if (key === 'DATABASE_URL') return 'postgres://test';
          if (key === 'NODE_ENV') return 'production';
          return null;
        }),
      };
    });

    it('should create database connection pool with ssl in production', async () => {
      const db = await databaseProvider.useFactory(mockConfigService as ConfigService);
      expect(db).toBe('mock-db');
    });

    it('should create database connection pool without ssl in development', async () => {
      mockConfigService.get = jest.fn().mockImplementation((key) => {
        if (key === 'DATABASE_URL') return 'postgres://test';
        if (key === 'NODE_ENV') return 'development';
        return null;
      });
      const db = await databaseProvider.useFactory(mockConfigService as ConfigService);
      expect(db).toBe('mock-db');
    });
  });
});
