import { Test, TestingModule } from '@nestjs/testing';
import { AudioIngestionGateway } from './audio-ingestion.gateway';
import { AudioIngestionService } from './audio-ingestion.service';
import { JwtService } from '@nestjs/jwt';
import { getLoggerToken } from 'nestjs-pino';
import { ChecksumUtil } from './utils/checksum.util';
import { HealthService } from '../health/health.service';

describe('AudioIngestionGateway', () => {
  let gateway: AudioIngestionGateway;
  let service: AudioIngestionService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioIngestionGateway,
        {
          provide: AudioIngestionService,
          useValue: { 
            ingestPacket: jest.fn().mockResolvedValue('test-id')
          },
        },
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
        {
          provide: HealthService,
          useValue: { saveBatch: jest.fn().mockResolvedValue(1) },
        },
        {
          provide: getLoggerToken(AudioIngestionGateway.name),
          useValue: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    gateway = module.get<AudioIngestionGateway>(AudioIngestionGateway);
    service = module.get<AudioIngestionService>(AudioIngestionService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should disconnect if no auth header', () => {
      const client = {
        handshake: { headers: {} },
        disconnect: jest.fn(),
        emit: jest.fn(),
        data: {},
        id: '123',
      } as any;

      gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should connect and assign deviceId if token valid', () => {
      const client = {
        handshake: { headers: { authorization: 'Bearer valid-token' } },
        disconnect: jest.fn(),
        emit: jest.fn(),
        data: {},
        id: '123',
      } as any;

      (jwtService.verify as jest.Mock).mockReturnValue({ deviceId: 'dev1', userId: 'user1' });

      gateway.handleConnection(client);
      expect(client.data.deviceId).toBe('dev1');
      expect(client.data.userId).toBe('user1');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect if token invalid', () => {
      const client = {
        handshake: { headers: { authorization: 'Bearer invalid-token' } },
        disconnect: jest.fn(),
        emit: jest.fn(),
        data: {},
        id: '123',
      } as any;

      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid');
      });

      gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnect', () => {
      const client = { data: { deviceId: 'dev1' }, id: '123' } as any;
      gateway.handleDisconnect(client);
    });
  });

  describe('handleAudioPacket', () => {
    it('should ingest packet and return ok', async () => {
      const client = { data: { deviceId: 'dev1', userId: 'user1' }, disconnect: jest.fn() } as any;
      const packet = {
        deviceId: 'dev1',
        sessionId: 's1',
        sequenceNo: 1,
        timestamp: 123,
        payloadType: 'AUDIO',
        payload: 'YWJj',
        checksum: ChecksumUtil.calculateCrc32(Buffer.from('YWJj', 'base64')).toString(16).padStart(8, '0'),
      };

      const result = await gateway.handleAudioPacket(client, packet);
      expect(result).toEqual({ status: 'accepted', packetId: 'test-id' });
      expect(service.ingestPacket).toHaveBeenCalledWith('dev1', 'user1', packet);
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect and return error if deviceId missing', async () => {
      const client = { data: {}, disconnect: jest.fn() } as any;
      const packet = {
        deviceId: 'dev1',
        sessionId: 's1',
        sequenceNo: 1,
        timestamp: 123,
        payloadType: 'AUDIO',
        payload: 'YWJj',
        checksum: ChecksumUtil.calculateCrc32(Buffer.from('YWJj', 'base64')).toString(16).padStart(8, '0'),
      };

      const result = await gateway.handleAudioPacket(client, packet);
      expect(result).toEqual({ status: 'error' });
      expect(service.ingestPacket).not.toHaveBeenCalled();
      expect(client.disconnect).toHaveBeenCalled();
    });
  });
});
