import { Test, TestingModule } from '@nestjs/testing';
import { OtaService } from './ota.service';
import { DRIZZLE } from '../../config/database.config';

describe('OtaService', () => {
  let service: OtaService;
  let dbMock: any;

  beforeEach(async () => {
    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtaService,
        { provide: DRIZZLE, useValue: dbMock },
      ],
    }).compile();

    service = module.get<OtaService>(OtaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkUpdate', () => {
    it('should return hasUpdate: false if no firmware records found', async () => {
      dbMock.limit.mockResolvedValueOnce([]);
      const result = await service.checkUpdate('1.0.0', 'ModelX');
      expect(result).toEqual({ hasUpdate: false });
    });

    it('should return hasUpdate: false if version matches', async () => {
      dbMock.limit.mockResolvedValueOnce([{ version: '1.0.0' }]);
      const result = await service.checkUpdate('1.0.0', 'ModelX');
      expect(result).toEqual({ hasUpdate: false });
    });

    it('should return update info if version differs', async () => {
      dbMock.limit.mockResolvedValueOnce([{
        version: '1.1.0',
        binaryUrl: 'http://example.com/bin',
        checksumSha256: 'abc',
        releaseNotes: 'Fixed bugs',
      }]);
      const result = await service.checkUpdate('1.0.0', 'ModelX');
      expect(result).toEqual({
        hasUpdate: true,
        update: {
          version: '1.1.0',
          binaryUrl: 'http://example.com/bin',
          checksumSha256: 'abc',
          releaseNotes: 'Fixed bugs',
        },
      });
    });
  });
});
