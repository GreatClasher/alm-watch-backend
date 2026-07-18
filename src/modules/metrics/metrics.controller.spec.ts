import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { DRIZZLE } from '../../config/database.config';

describe('MetricsController', () => {
  let controller: MetricsController;
  let dbMock: any;

  beforeEach(async () => {
    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        { provide: DRIZZLE, useValue: dbMock },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return metrics string', async () => {
      // 1: devices (ends with from)
      dbMock.from.mockResolvedValueOnce([{ count: 10 }]);
      // 2: active devices (ends with where)
      dbMock.from.mockReturnValueOnce(dbMock);
      dbMock.where.mockResolvedValueOnce([{ count: 5 }]);
      // 3: sessions (ends with from)
      dbMock.from.mockResolvedValueOnce([{ count: 100 }]);
      // 4: packets (ends with from)
      dbMock.from.mockResolvedValueOnce([{ count: 1000 }]);

      const result = await controller.getMetrics();
      expect(result).toContain('jabbelpin_devices_total 10');
      expect(result).toContain('jabbelpin_devices_active 5');
      expect(result).toContain('jabbelpin_sessions_total 100');
      expect(result).toContain('jabbelpin_packets_total 1000');
    });
  });
});
