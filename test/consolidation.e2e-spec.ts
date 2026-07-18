import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { ConsolidationService } from '../src/modules/consolidation/consolidation.service';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../src/config/database.config';
import { memories } from '../src/modules/memory/entities/memory.entity';
import { episodes } from '../src/modules/episode/entities/episode.entity';
import { conversations } from '../src/modules/conversation/entities/conversation.entity';
import { recordings } from '../src/modules/recording/entities/recording.entity';
import { observations } from '../src/modules/observation/entities/observation.entity';
import { eq } from 'drizzle-orm';
import { devices } from '../src/modules/device/entities/device.entity';
import { LlmProvider } from '../src/modules/llm/llm.provider';

describe('ConsolidationService (e2e)', () => {
  let app: INestApplication;
  let consolidationService: ConsolidationService;
  let db: NodePgDatabase<any>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LlmProvider)
      .useValue({
        generateStructured: jest.fn().mockResolvedValue({ entities: [], edges: [], memories: [] }),
        generateEmbedding: jest.fn().mockResolvedValue(new Array(384).fill(0)),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    consolidationService = moduleFixture.get<ConsolidationService>(ConsolidationService);
    db = moduleFixture.get<NodePgDatabase<any>>(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.delete(observations);
    await db.delete(memories);
    await db.delete(episodes);
    await db.delete(conversations);
  });


  it('should apply memory reinforcement based on lastRecalledAt', async () => {
    const testUserId = '00000000-0000-0000-0000-000000000001';
    const mem1 = await db.insert(memories).values({
      userId: testUserId,
      kind: 'semantic',
      summary: 'Test memory',
      strength: 0.5,
      lastRecalledAt: new Date(Date.now() - 48 * 3600 * 1000) // 2 days ago
    }).returning();

    const mem2 = await db.insert(memories).values({
      userId: testUserId,
      kind: 'semantic',
      summary: 'Test memory 2',
      strength: 0.5,
      lastRecalledAt: new Date() // Just recalled
    }).returning();

    await consolidationService.consolidate();

    const updatedMem1 = (await db.select().from(memories).where(eq(memories.id, mem1[0]!.id)))[0];
    const updatedMem2 = (await db.select().from(memories).where(eq(memories.id, mem2[0]!.id)))[0];

    // mem1: not recently recalled, remains 0.5
    expect(updatedMem1!.strength).toBeCloseTo(0.5);
    // mem2: recently recalled, + 0.1 = 0.6
    expect(updatedMem2!.strength).toBeCloseTo(0.6);
  });

  it('should boost emotional salience', async () => {
    const testUserId = '00000000-0000-0000-0000-000000000001';
    const device = await db.insert(devices).values({ userId: testUserId, deviceSerial: `test_dev_${Date.now()}_2`, firmwareVersion: '1.0' }).returning();
    const rec = await db.insert(recordings).values({ userId: testUserId, deviceId: device[0]!.id, startedAt: new Date() }).returning();
    const conv = await db.insert(conversations).values({ userId: testUserId, recordingId: rec[0]!.id, startedAt: new Date() }).returning();
    const ep = await db.insert(episodes).values({ 
      userId: testUserId,
      conversationId: conv[0]!.id, 
      title: 'emotional episode',
      importance: 0.5 
    }).returning();

    // High emotion observation
    await db.insert(observations).values({
      userId: testUserId,
      recordingId: rec[0]!.id,
      conversationId: conv[0]!.id,
      type: 'speech',
      timestampStart: new Date(),
      payload: { emotion: 'joy', emotion_confidence: 0.9, text: 'wow!' }
    });

    const mem = await db.insert(memories).values({
      userId: testUserId,
      kind: 'semantic',
      summary: 'Emotional memory',
      importance: 0.5,
      sourceEpisodeId: ep[0]!.id
    }).returning();

    await consolidationService.consolidate();

    const updatedEp = (await db.select().from(episodes).where(eq(episodes.id, ep[0]!.id)))[0];
    const updatedMem = (await db.select().from(memories).where(eq(memories.id, mem[0]!.id)))[0];

    // 0.5 * 1.2 = 0.6
    expect(updatedEp!.importance).toBeCloseTo(0.6);
    expect(updatedMem!.importance).toBeCloseTo(0.6);
  });
});
