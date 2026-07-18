import { Test, TestingModule } from '@nestjs/testing';
import { AudioIngestionService } from './audio-ingestion.service';
import { DRIZZLE } from '../../config/database.config';
import { getLoggerToken } from 'nestjs-pino';
import { ChecksumUtil } from './utils/checksum.util';

describe('AudioIngestionService', () => {
  let service: AudioIngestionService;
  let dbMock: any;

  beforeEach(async () => {
    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      onConflictDoNothing: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 'test-id' }]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioIngestionService,
        { provide: DRIZZLE, useValue: dbMock },
        {
          provide: getLoggerToken(AudioIngestionService.name),
          useValue: { info: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AudioIngestionService>(AudioIngestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ingestPacket', () => {
    it('should create new session if not found, and ingest packet', async () => {
      dbMock.limit.mockResolvedValueOnce([]); // no session found
      
      const packet = {
        deviceId: 'dev1',
        sessionId: 's1',
        sequenceNo: 1,
        timestamp: 1234567890,
        payloadType: 'AUDIO',
        payload: 'YWJj',
        checksum: ChecksumUtil.calculateCrc32(Buffer.from('YWJj', 'base64')).toString(16).padStart(8, '0'),
      };

      await service.ingestPacket('dev1', 'user1', packet);

      expect(dbMock.insert).toHaveBeenCalledTimes(2); // once for session, once for packet
      expect(dbMock.values).toHaveBeenCalledTimes(2);
      expect(dbMock.onConflictDoNothing).toHaveBeenCalledTimes(2);
    });

    it('should not create session if already found, just ingest packet', async () => {
      dbMock.limit.mockResolvedValueOnce([{ id: 's1' }]); // session found
      
      const packet = {
        deviceId: 'dev1',
        sessionId: 's1',
        sequenceNo: 1,
        timestamp: 1234567890,
        payloadType: 'HEARTBEAT',
        payload: 'YWJj',
        checksum: ChecksumUtil.calculateCrc32(Buffer.from('YWJj', 'base64')).toString(16).padStart(8, '0'),
      };

      await service.ingestPacket('dev1', 'user1', packet);

      expect(dbMock.insert).toHaveBeenCalledTimes(1); // only packet
      expect(dbMock.values).toHaveBeenCalledTimes(1);
      expect(dbMock.onConflictDoNothing).toHaveBeenCalledTimes(1);
    });
  });
});
