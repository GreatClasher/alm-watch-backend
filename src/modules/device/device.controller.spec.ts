import { Test, TestingModule } from '@nestjs/testing';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { DeviceAlreadyRegisteredError } from '../../common/errors/device-already-registered.error';
import { DeviceNotFoundError } from '../../common/errors/device-not-found.error';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';

describe('DeviceController', () => {
  let controller: DeviceController;
  let service: DeviceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceController],
      providers: [
        {
          provide: DeviceService,
          useValue: {
            registerDevice: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(DeviceAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<DeviceController>(DeviceController);
    service = module.get<DeviceService>(DeviceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const mockResult = { deviceId: '1', token: 'tok', expiresAt: 'date' };
      jest.spyOn(service, 'registerDevice').mockResolvedValue(mockResult);

      const result = await controller.register({
        userId: 'test-user-id',
        deviceSerial: 'SN',
        firmwareVersion: '1.0',
        model: 'M',
      });
      expect(result).toEqual(mockResult);
    });

    it('should return token on duplicate', async () => {
      const mockResult = { deviceId: '1', token: 'tok', expiresAt: 'date' };
      jest.spyOn(service, 'registerDevice').mockResolvedValue(mockResult);

      const result = await controller.register({ userId: 'test-user-id', deviceSerial: 'SN', firmwareVersion: '1.0', model: 'M' });
      expect(result).toEqual(mockResult);
    });
  });

  describe('getDevice', () => {
    it('should return device status', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue({
        id: '1',
        userId: 'test-user-id',
        deviceSerial: 'SN',
        firmwareVersion: '1',
        model: 'M',
        status: 'active',
        lastHeartbeatAt: new Date(),
        batteryLevel: 100,
        bleConnected: true,
        flashUsagePercent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await controller.getDevice('1');
      expect(result.deviceId).toBe('1');
    });

    it('should throw NotFoundException if missing', async () => {
      jest.spyOn(service, 'findById').mockRejectedValue(new DeviceNotFoundError('1'));

      await expect(controller.getDevice('1')).rejects.toThrow(NotFoundException);
    });
  });
});
