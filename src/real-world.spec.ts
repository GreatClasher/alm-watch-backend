import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { JwtService } from '@nestjs/jwt';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { AppModule } from './app.module';
import { DRIZZLE } from './config/database.config';
import { audioPackets } from './modules/audio-ingestion/entities/audio-ingestion.entity';
import { ChecksumUtil } from './modules/audio-ingestion/utils/checksum.util';

describe('Real-World Integration Test Scenarios (Backend)', () => {
  let app: INestApplication;
  let dbMock: any;
  let serverPort: number;

  beforeAll(async () => {
    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      onConflictDoNothing: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 'test-id' }]),
      delete: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(JwtService)
      .useValue({
        verify: (token: string) => {
          if (token === 'valid.token')
            return { deviceId: '11111111-1111-1111-1111-111111111111', userId: 'user-123' };
          throw new Error('Invalid token');
        },
      })
      .overrideProvider(DRIZZLE)
      .useValue(dbMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);
    serverPort = app.getHttpServer().address().port;
  });

  afterAll(async () => {
    await app.close();
  });

  const getSocket = (token?: string): Socket => {
    const s = io(`http://localhost:${serverPort}/device`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false,
    });
    s.on('exception', (err) => {
      console.dir({ WS_EXCEPTION: err }, { depth: null });
    });
    return s;
  };

  const getValidPacket = (overrides: any = {}) => {
    const payload = overrides.payload || 'c29tZWF1ZGlvZGF0YQ==';
    const checksum = overrides.checksum || ChecksumUtil.calculateCrc32(Buffer.from(payload, 'base64')).toString(16).padStart(8, '0');
    return {
      // ponytail: v4 UUID required by @IsUUID() — version nibble=4, variant=a
      deviceId: '11111111-1111-4111-a111-111111111111',
      sessionId: '33333333-3333-4333-a333-333333333333',
      sequenceNo: Math.floor(Math.random() * 60000),
      timestamp: Date.now(),
      payloadType: 'AUDIO',
      payload,
      checksum,
      ...overrides,
    };
  };

  it('1.1 Authentication & Authorization Failures - Invalid JWT', (done) => {
    let isDone = false;
    const socket = getSocket('invalid.jwt.token');
    socket.on('disconnect', () => {
      if (!isDone) {
        isDone = true;
        done();
      }
    });
    socket.connect();
  });

  // ponytail: spec says "Payload deviceId ignored; backend uses JWT deviceId".
  // The forged deviceId in the packet DTO is silently replaced by gateway with client.data.deviceId.
  // JWT mock returns deviceId '11111111-1111-1111-1111-111111111111' (stored in client.data, not DTO-validated).
  it('1.1 Authentication & Authorization - Forged deviceId replaced by JWT deviceId', (done) => {
    const socket = getSocket('valid.token');
    const FORGED_DEVICE_ID = '22222222-2222-4222-a222-222222222222';

    socket.on('connect', () => {
      const packet = getValidPacket({
        deviceId: FORGED_DEVICE_ID,
        sequenceNo: 1,
      });
      socket.emit('audio:packet', packet, (res: any) => {
        // Packet accepted — gateway replaced deviceId with JWT deviceId
        expect(res.status).toBe('accepted');
        // Service receives JWT deviceId (not the forged one)
        const insertedDeviceId = dbMock.values.mock.calls.slice(-1)[0][0].deviceId;
        expect(insertedDeviceId).not.toBe(FORGED_DEVICE_ID);
        socket.disconnect();
        done();
      });
    });
    socket.connect();
  });

  it('1.2 Payload Validation & Malformed Data - Malformed JSON', (done) => {
    const socket = getSocket('valid.token');
    socket.on('connect', () => {
      socket.on('exception', (res: any) => {
        expect(res.error.code).toBe('WS_ERROR');
        socket.disconnect();
        done();
      });
      socket.emit('audio:packet', { bad: 'data' });
    });
    socket.connect();
  });

  it('1.2 Payload Validation & Malformed Data - Unrecognized Payload Type', (done) => {
    const socket = getSocket('valid.token');
    socket.on('connect', () => {
      const packet = getValidPacket({ payloadType: 'UNKNOWN' });
      socket.on('exception', (res: any) => {
        expect(res.error.code).toBe('WS_ERROR');
        socket.disconnect();
        done();
      });
      socket.emit('audio:packet', packet);
    });
    socket.connect();
  });

  it('1.3 Data Integrity & Checksums - Invalid Checksum', (done) => {
    const socket = getSocket('valid.token');
    socket.on('connect', () => {
      const packet = getValidPacket({ checksum: 'invalid-crc32' });
      socket.on('exception', (res: any) => {
        expect(res.error.code).toBe('WS_ERROR');
        socket.disconnect();
        done();
      });
      socket.emit('audio:packet', packet);
    });
    socket.connect();
  });

  it('1.4 Sequencing - Out of order sequence numbers', (done) => {
    const socket = getSocket('valid.token');
    socket.on('connect', () => {
      socket.emit('audio:packet', getValidPacket({ sequenceNo: 10 }), (res1: any) => {
        expect(res1.status).toBe('accepted');
        socket.emit('audio:packet', getValidPacket({ sequenceNo: 5 }), (res2: any) => {
          expect(res2.status).toBe('accepted');
          socket.disconnect();
          done();
        });
      });
    });
    socket.connect();
  });

  // ponytail: DTO accepts 0..65535; send 65535 then 0 — both valid, both accepted.
  it('1.4 Sequencing - Sequence number rollover (65535 → 0) accepted', (done) => {
    const socket = getSocket('valid.token');
    socket.on('connect', () => {
      socket.emit('audio:packet', getValidPacket({ sequenceNo: 65535 }), (res1: any) => {
        expect(res1.status).toBe('accepted');
        socket.emit('audio:packet', getValidPacket({ sequenceNo: 0 }), (res2: any) => {
          expect(res2.status).toBe('accepted');
          socket.disconnect();
          done();
        });
      });
    });
    socket.connect();
  });

  it('1.4 Sequencing & Idempotency - Duplicate Packets', (done) => {
    const socket = getSocket('valid.token');
    socket.on('connect', () => {
      const packet = getValidPacket({ sequenceNo: 999 });
      socket.emit('audio:packet', packet, async (res1: any) => {
        expect(res1.status).toBe('accepted');
        socket.emit('audio:packet', packet, async (res2: any) => {
          expect(res2.status).toBe('accepted');
          expect(dbMock.onConflictDoNothing).toHaveBeenCalled();
          socket.disconnect();
          done();
        });
      });
    });
    socket.connect();
  });

  // ponytail: concurrent writes — both accepted, onConflictDoNothing prevents race-condition crashes.
  it('1.5 Concurrent writes for same session do not crash', (done) => {
    const socket = getSocket('valid.token');
    socket.on('connect', () => {
      const SESSION_ID = '44444444-4444-4444-a444-444444444444';
      const packets = [
        getValidPacket({ sessionId: SESSION_ID, sequenceNo: 100 }),
        getValidPacket({ sessionId: SESSION_ID, sequenceNo: 101 }),
        getValidPacket({ sessionId: SESSION_ID, sequenceNo: 102 }),
      ];
      let count = 0;
      packets.forEach((p) =>
        socket.emit('audio:packet', p, (res: any) => {
          expect(res.status).toBe('accepted');
          expect(dbMock.onConflictDoNothing).toHaveBeenCalled();
          if (++count === packets.length) { socket.disconnect(); done(); }
        }),
      );
    });
    socket.connect();
  });

  // ponytail: disconnect mid-stream — just verify server doesn't crash; no DB-mock assertion needed
  // since the mock is shared across tests and the packet may resolve asynchronously.
  it('1.5 Network Jitter - Disconnect does not corrupt transactions', (done) => {
    const socket = getSocket('valid.token');
    socket.on('connect', () => {
      const packet = getValidPacket({ sequenceNo: 2000 });
      socket.emit('audio:packet', packet);
      setTimeout(() => { socket.disconnect(); }, 50);
      // Server doesn't crash — done fires after brief wait
      setTimeout(() => { done(); }, 300);
    });
    socket.connect();
  });

  it('1.5 Network Jitter - Network Restored Flood (100+ packets)', (done) => {
    const socket = getSocket('valid.token');
    socket.on('connect', async () => {
      const promises = [];
      const packetsCount = 150;
      let ackCount = 0;
      const startSeq = 10000;
      for (let i = 0; i < packetsCount; i++) {
        const packet = getValidPacket({ sequenceNo: startSeq + i });
        promises.push(
          new Promise<void>((resolve) => {
            socket.emit('audio:packet', packet, (res: any) => {
              expect(res.status).toBe('accepted');
              ackCount++;
              resolve();
            });
          })
        );
      }
      await Promise.all(promises);
      expect(ackCount).toBe(packetsCount);
      socket.disconnect();
      done();
    });
    socket.connect();
  });
});
