import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { DRIZZLE } from '../../config/database.config';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('SessionService', () => {
  let service: SessionService;
  let dbMock: any;

  beforeEach(async () => {
    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn(),
      $dynamic: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: DRIZZLE, useValue: dbMock },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSessions', () => {
    it('should return paginated sessions', async () => {
      // Data query
      dbMock.where.mockReturnValueOnce(dbMock);
      dbMock.orderBy.mockReturnValueOnce(dbMock);
      dbMock.limit.mockReturnValueOnce(dbMock);
      dbMock.offset.mockResolvedValueOnce([{ id: 's1' }]);
      // Total query
      dbMock.where.mockResolvedValueOnce([{ count: 1 }]);

      const result = await service.getSessions('dev1', undefined, undefined, undefined as any, 1, 10);
      expect(result).toEqual({
        data: [{ id: 's1' }],
        total: 1,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('getSessionPackets', () => {
    it('should throw NotFoundException if session not found', async () => {
      dbMock.where.mockReturnValueOnce(dbMock);
      dbMock.limit.mockResolvedValueOnce([]);
      
      await expect(service.getSessionPackets('dev1', 's1', 1, 10))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if session does not belong to device', async () => {
      dbMock.where.mockReturnValueOnce(dbMock);
      dbMock.limit.mockResolvedValueOnce([{ id: 's1', deviceId: 'dev2' }]);

      await expect(service.getSessionPackets('dev1', 's1', 1, 10))
        .rejects.toThrow(ForbiddenException);
    });

    it('should return paginated packets', async () => {
      // Session lookup
      dbMock.where.mockReturnValueOnce(dbMock);
      dbMock.limit.mockResolvedValueOnce([{ id: 's1', deviceId: 'dev1' }]);
      // Packets data query
      dbMock.where.mockReturnValueOnce(dbMock);
      dbMock.orderBy.mockReturnValueOnce(dbMock);
      dbMock.limit.mockReturnValueOnce(dbMock);
      dbMock.offset.mockResolvedValueOnce([{ id: 'p1' }]);
      // Total count query
      dbMock.where.mockResolvedValueOnce([{ count: 1 }]);

      const result = await service.getSessionPackets('dev1', 's1', 1, 10);
      expect(result).toEqual({
        data: [{ id: 'p1' }],
        total: 1,
        page: 1,
        limit: 10,
      });
    });
  });
});
