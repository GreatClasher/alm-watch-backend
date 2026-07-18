import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../src/config/database.config';
import { memories } from '../src/modules/memory/entities/memory.entity';
import { LlmProvider } from '../src/modules/llm/llm.provider';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

describe('QueryController (e2e)', () => {
  let app: INestApplication;
  let db: NodePgDatabase<any>;
  let mockLlmProvider: any;

  beforeAll(async () => {
    mockLlmProvider = {
      generateStructured: jest.fn(),
      generateEmbedding: jest.fn().mockResolvedValue(new Array(384).fill(0.5)),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LlmProvider)
      .useValue(mockLlmProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = moduleFixture.get<NodePgDatabase<any>>(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.delete(memories);
  });

  it('/v1/query/ask (POST) - should retrieve memory and update lastRecalledAt', async () => {
    const testUserId = '00000000-0000-0000-0000-000000000001';

    // 1. Insert a mock memory
    const mem = await db.insert(memories).values({
      userId: testUserId,
      kind: 'semantic',
      summary: 'Test memory for querying',
      embedding: new Array(384).fill(0.5), // Match the mock LLM embedding
    }).returning();

    // 2. Setup mock LLM responses
    // First call: Query Rewriting
    mockLlmProvider.generateStructured.mockResolvedValueOnce({
      searchTerms: 'Test query',
    });
    
    // Second call: Answer Generation
    mockLlmProvider.generateStructured.mockResolvedValueOnce({
      answer: 'This is the test answer.',
      usedMemoryIds: [1], // Memory 1 maps to mem[0].id in the integer map
    });

    // 3. Make the request
    const response = await request(app.getHttpServer())
      .post('/v1/query/ask')
      .send({ query: 'Test query', userId: testUserId })
      .expect(201);

    expect(response.body).toEqual({
      answer: 'This is the test answer.',
      usedMemoryIds: [1],
    });

    // 4. Verify memory reinforcement
    const updatedMem = (await db.select().from(memories).where(eq(memories.id, mem[0]!.id)))[0];
    expect(updatedMem!.lastRecalledAt).not.toBeNull();
    expect(updatedMem!.recallCount).toEqual(1);
  });
});
