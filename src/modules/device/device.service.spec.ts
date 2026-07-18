import { Test, TestingModule } from '@nestjs/testing';
import { DeviceService } from './device.service';
import { DRIZZLE } from '../../config/database.config';
import { ConfigService } from '@nestjs/config';
import { getLoggerToken } from 'nestjs-pino';
import { DeviceAlreadyRegisteredError } from '../../common/errors/device-already-registered.error';
import { DeviceNotFoundError } from '../../common/errors/device-not-found.error';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';

jest.mock('fs');
jest.mock('jsonwebtoken');

describe('DeviceService', () => {
  let service: DeviceService;
  let dbMock: any;

  beforeEach(async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('dummy-key');
    (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      $dynamic: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      offset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        { provide: DRIZZLE, useValue: dbMock },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockImplementation((key) => {
            if (key === 'JWT_EXPIRES_IN') return 86400;
            if (key === 'JWT_PRIVATE_KEY_PATH') return 'path/to/key';
            return null;
          }) },
        },
        {
          provide: getLoggerToken(DeviceService.name),
          useValue: { info: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<DeviceService>(DeviceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerDevice', () => {
    it('should register a device and return token', async () => {
      dbMock.limit.mockResolvedValueOnce([]); // existing not found
      dbMock.returning.mockResolvedValueOnce([{ id: 'uuid', deviceSerial: 'SN123' }]); // inserted

      const result = await service.registerDevice({
        userId: 'user-123',
        deviceSerial: 'SN123',
        firmwareVersion: '1.0.0',
        model: 'ModelX',
      });

      expect(result).toHaveProperty('token');
      expect(result.deviceId).toBe('uuid');
    });

    it('should return a new token if device already exists', async () => {
      dbMock.limit.mockResolvedValueOnce([{ id: 'uuid', deviceSerial: 'SN123' }]); // existing found

      const result = await service.registerDevice({
        userId: 'user-123',
        deviceSerial: 'SN123',
        firmwareVersion: '1.0.0',
        model: 'ModelX',
      });
      
      expect(result).toHaveProperty('token');
      expect(result.deviceId).toBe('uuid');
    });
  });

  describe('findById', () => {
    it('should find device by id', async () => {
      dbMock.limit.mockResolvedValueOnce([{ id: 'uuid', deviceSerial: 'SN123' }]);

      const result = await service.findById('uuid');
      expect(result.deviceSerial).toBe('SN123');
    });

    it('should throw if not found', async () => {
      dbMock.limit.mockResolvedValueOnce([]);

      await expect(service.findById('uuid')).rejects.toThrow(DeviceNotFoundError);
    });
  });

  describe('updateHeartbeat', () => {
    it('should update heartbeat', async () => {
      await service.updateHeartbeat('uuid', {
        batteryLevel: 90,
        bleConnected: true,
        flashUsagePercent: 10,
      });

      expect(dbMock.update).toHaveBeenCalled();
      expect(dbMock.set).toHaveBeenCalled();
      expect(dbMock.where).toHaveBeenCalled();
    });
  });
});
