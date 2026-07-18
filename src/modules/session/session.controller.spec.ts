import { Test, TestingModule } from '@nestjs/testing';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

describe('SessionController', () => {
  let controller: SessionController;
  let service: SessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        {
          provide: SessionService,
          useValue: {
            getSessions: jest.fn(),
            getSessionPackets: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SessionController>(SessionController);
    service = module.get<SessionService>(SessionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSessions', () => {
    it('should return sessions', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 10 };
      jest.spyOn(service, 'getSessions').mockResolvedValue(mockResult);

      const result = await controller.getSessions('dev1', '{}', '{}', '[]', 1, 10);
      expect(result).toEqual(mockResult);
      expect(service.getSessions).toHaveBeenCalledWith('dev1', {}, {}, [], 1, 10);
    });
  });

  describe('getSessionPackets', () => {
    it('should return session packets', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 10 };
      jest.spyOn(service, 'getSessionPackets').mockResolvedValue(mockResult);

      const result = await controller.getSessionPackets('s1', 1, 10);
      expect(result).toEqual(mockResult);
      expect(service.getSessionPackets).toHaveBeenCalledWith('', 's1', 1, 10);
    });
  });
});
