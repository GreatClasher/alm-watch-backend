import { Test, TestingModule } from '@nestjs/testing';
import { OtaController } from './ota.controller';
import { OtaService } from './ota.service';
import { DeviceService } from '../device/device.service';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { BadRequestException } from '@nestjs/common';

describe('OtaController', () => {
  let controller: OtaController;
  let otaService: OtaService;
  let deviceService: DeviceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OtaController],
      providers: [
        {
          provide: OtaService,
          useValue: { checkUpdate: jest.fn() },
        },
        {
          provide: DeviceService,
          useValue: { findById: jest.fn() },
        },
      ],
    })
      .overrideGuard(DeviceAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<OtaController>(OtaController);
    otaService = module.get<OtaService>(OtaService);
    deviceService = module.get<DeviceService>(DeviceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkUpdate', () => {
    it('should throw BadRequestException if currentVersion is missing', async () => {
      await expect(controller.checkUpdate('dev1')).rejects.toThrow(BadRequestException);
    });

    it('should call checkUpdate with device model', async () => {
      jest.spyOn(deviceService, 'findById').mockResolvedValue({
        id: 'dev1',
        model: 'ModelX',
      } as any);
      jest.spyOn(otaService, 'checkUpdate').mockResolvedValue({ hasUpdate: false });

      const result = await controller.checkUpdate('dev1', '1.0.0');
      expect(result).toEqual({ hasUpdate: false });
      expect(deviceService.findById).toHaveBeenCalledWith('dev1');
      expect(otaService.checkUpdate).toHaveBeenCalledWith('1.0.0', 'ModelX');
    });

    it('should fallback to default model if not set', async () => {
      jest.spyOn(deviceService, 'findById').mockResolvedValue({
        id: 'dev1',
      } as any);
      jest.spyOn(otaService, 'checkUpdate').mockResolvedValue({ hasUpdate: false });

      await controller.checkUpdate('dev1', '1.0.0');
      expect(otaService.checkUpdate).toHaveBeenCalledWith('1.0.0', 'default');
    });
  });
});
