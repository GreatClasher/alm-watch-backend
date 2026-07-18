import { Test, TestingModule } from '@nestjs/testing';
import { HeartbeatService } from './heartbeat.service';
import { DeviceService } from '../device/device.service';
import { DRIZZLE } from '../../config/database.config';
import { getLoggerToken } from 'nestjs-pino';

describe('HeartbeatService', () => {
  let service: HeartbeatService;
  let dbMock: any;
  let deviceService: DeviceService;

  beforeEach(async () => {
    dbMock = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue({ rowCount: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeartbeatService,
        { provide: DRIZZLE, useValue: dbMock },
        {
          provide: DeviceService,
          useValue: { updateHeartbeat: jest.fn() },
        },
        {
          provide: getLoggerToken(HeartbeatService.name),
          useValue: { info: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<HeartbeatService>(HeartbeatService);
    deviceService = module.get<DeviceService>(DeviceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordHeartbeat', () => {
    it('should record heartbeat and update device status', async () => {
      const dto = { batteryLevel: 100, bleConnected: true, flashUsagePercent: 5 };
      const deviceId = 'dev1';
      await service.recordHeartbeat(deviceId, 'test-user-id', dto);

      expect(dbMock.insert).toHaveBeenCalled();
      expect(dbMock.values).toHaveBeenCalled();
      expect(deviceService.updateHeartbeat).toHaveBeenCalledWith('dev1', dto);
      expect(dbMock.update).toHaveBeenCalled();
      expect(dbMock.set).toHaveBeenCalled();
      expect(dbMock.where).toHaveBeenCalled();
    });
  });

  describe('checkStaleDevices', () => {
    it('should mark stale devices inactive', async () => {
      await service.checkStaleDevices();
      expect(dbMock.update).toHaveBeenCalled();
      expect(dbMock.set).toHaveBeenCalled();
      expect(dbMock.where).toHaveBeenCalled();
    });
  });
});
