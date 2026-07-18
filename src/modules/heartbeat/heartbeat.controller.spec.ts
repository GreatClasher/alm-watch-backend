import { Test, TestingModule } from '@nestjs/testing';
import { HeartbeatController } from './heartbeat.controller';
import { HeartbeatService } from './heartbeat.service';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';

describe('HeartbeatController', () => {
  let controller: HeartbeatController;
  let service: HeartbeatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeartbeatController],
      providers: [
        {
          provide: HeartbeatService,
          useValue: {
            recordHeartbeat: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(DeviceAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<HeartbeatController>(HeartbeatController);
    service = module.get<HeartbeatService>(HeartbeatService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('heartbeat', () => {
    it('should call recordHeartbeat and return ok', async () => {
      const dto = { batteryLevel: 100, bleConnected: true, flashUsagePercent: 5 };
      jest.spyOn(service, 'recordHeartbeat').mockResolvedValue(undefined);

      const result = await controller.heartbeat('test-user-id', 'dev1', dto);
      expect(result).toEqual({ status: 'ok' });
      // Wait, let's match the order used in controller: service.recordHeartbeat(deviceId, userId, dto)
      expect(service.recordHeartbeat).toHaveBeenCalledWith('dev1', 'test-user-id', dto);
    });
  });
});
