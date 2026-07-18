import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, asc, count, and } from 'drizzle-orm';
import { sessions } from './entities/session.entity';
import { audioPackets } from '../audio-ingestion/entities/audio-ingestion.entity';
import { transcripts } from '../transcript/entities/transcript.entity';
import { utterances } from '../utterance/entities/utterance.entity';
import { DRIZZLE } from '../../config/database.config';

@Injectable()
export class SessionService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase,
  ) {}

  async getSessions(deviceId: string, whereObj: any, orderObj: any, selectObj: string[], page: number, limit: number) {
    const { buildDrizzleWhere, buildDrizzleOrderBy, buildDrizzleSelect } = require('../../common/utils/query-parser.util');
    
    let whereClause = buildDrizzleWhere(sessions, whereObj);
    // Enforce deviceId matching
    whereClause = whereClause ? and(whereClause, eq(sessions.deviceId, deviceId)) : eq(sessions.deviceId, deviceId);

    const orderClauses = buildDrizzleOrderBy(sessions, orderObj);
    if (orderClauses.length === 0) {
      orderClauses.push(desc(sessions.startedAt));
    }

    const selectClause = buildDrizzleSelect(sessions, selectObj);

    let query: any = this.db.select(selectClause).from(sessions).$dynamic();
    query = query.where(whereClause);
    
    if (orderClauses.length > 0) {
      query = query.orderBy(...orderClauses);
    }
    
    const data = await query.limit(limit).offset((page - 1) * limit);

    const totalQuery = await this.db.select({ count: count() }).from(sessions).where(whereClause);
    const total = totalQuery[0]!.count;

    return { data, total, page, limit };
  }

  async getSessionPackets(deviceId: string, sessionId: string, page: number, limit: number) {
    const sessionRecords = await this.db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (sessionRecords.length === 0) {
      throw new NotFoundException('Session not found');
    }
    
    const session = sessionRecords[0]!;
    if (session.deviceId !== deviceId && deviceId !== '') {
      throw new ForbiddenException('Session does not belong to this device');
    }

    const data = await this.db.select().from(audioPackets)
      .where(eq(audioPackets.sessionId, sessionId))
      .orderBy(asc(audioPackets.sequenceNo))
      .limit(limit)
      .offset((page - 1) * limit);

    const totalQuery = await this.db.select({ count: count() }).from(audioPackets).where(eq(audioPackets.sessionId, sessionId));
    const total = totalQuery[0]!.count;

    return { data, total, page, limit };
  }

  async getSessionAudio(deviceId: string, sessionId: string) {
    const sessionRecords = await this.db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (sessionRecords.length === 0) {
      throw new NotFoundException('Session not found');
    }
    
    // Check auth if deviceId is provided (e.g. from device guard)
    // If it's a generic call without device token, this might be bypassed in controller.
    // Assuming deviceId is verified in controller if present.
    if (deviceId && deviceId !== '' && sessionRecords[0]!.deviceId !== deviceId) {
      throw new ForbiddenException('Session does not belong to this device');
    }

    const { OggOpusWriter } = require('../../common/utils/ogg-muxer.util');
    const oggWriter = new OggOpusWriter(16000, 1);

    // To prevent blocking, we can fetch all packets. They are usually small enough.
    // If they get large, we should paginate.
    const packets = await this.db.select().from(audioPackets)
      .where(eq(audioPackets.sessionId, sessionId))
      .orderBy(asc(audioPackets.sequenceNo));

    // We write to the stream asynchronously to not block the event loop if there are many packets
    setImmediate(() => {
      for (const packet of packets) {
        if (packet.payload) {
          oggWriter.write(packet.payload);
        }
      }
      oggWriter.end();
    });

    return oggWriter;
  }

  async getSessionUtterances(deviceId: string, sessionId: string) {
    const sessionRecords = await this.db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (sessionRecords.length === 0) {
      throw new NotFoundException('Session not found');
    }

    if (deviceId && deviceId !== '' && sessionRecords[0]!.deviceId !== deviceId) {
      throw new ForbiddenException('Session does not belong to this device');
    }

    // Find the transcript for this session
    const transcriptRecords = await this.db.select().from(transcripts).where(eq(transcripts.sessionId, sessionId)).limit(1);
    if (transcriptRecords.length === 0) {
      return []; // No transcript yet
    }
    const transcriptId = transcriptRecords[0]!.id;

    // Fetch utterances for this transcript
    const result = await this.db.select().from(utterances)
      .where(eq(utterances.transcriptId, transcriptId))
      .orderBy(asc(utterances.startTime));
      
    return result;
  }
}
