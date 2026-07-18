import { ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';

import { devices, DeviceEntity } from './entities/device.entity';
import type { RegisterDeviceDto } from './dto/register-device.dto';
import type { RegisterDeviceResponseDto } from './dto/register-device-response.dto';
import { DeviceNotFoundError } from '../../common/errors/device-not-found.error';
import { DRIZZLE } from '../../config/database.config';
import { ConfigService } from '@nestjs/config';

const JWT_ISSUER = 'jabbelpin-api';
const JWT_AUDIENCE = 'jabbelpin-device';

interface HeartbeatUpdateData {
  batteryLevel: number;
  bleConnected: boolean;
  flashUsagePercent: number;
}

@Injectable()
export class DeviceService {
  private readonly privateKey: string;

  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase,
    private readonly configService: ConfigService,
    @InjectPinoLogger(DeviceService.name)
    private readonly logger: PinoLogger,
  ) {
    const keyPath = this.configService.get<string>('JWT_PRIVATE_KEY_PATH');
    if (keyPath && fs.existsSync(keyPath)) {
      this.privateKey = fs.readFileSync(keyPath, 'utf-8');
    } else {
      this.privateKey = '';
    }
  }

  async registerDevice(dto: RegisterDeviceDto): Promise<RegisterDeviceResponseDto> {
    const existing = await this.db
      .select()
      .from(devices)
      .where(eq(devices.deviceSerial, dto.deviceSerial))
      .limit(1);

    let device: DeviceEntity;
    if (existing.length > 0) {
      device = existing[0]!;
    } else {
      const inserted = await this.db
        .insert(devices)
        .values({
          userId: dto.userId,
          deviceSerial: dto.deviceSerial,
          firmwareVersion: dto.firmwareVersion,
          model: dto.model,
          status: 'active',
        })
        .returning();
      device = inserted[0]!;
    }

    const expiresInSeconds = this.configService.get<number>('JWT_EXPIRES_IN', 86400);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const token = jwt.sign(
      {
        sub: device.id,
        deviceId: device.id,
        userId: device.userId,
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
      },
      this.privateKey,
      { algorithm: 'RS256', expiresIn: expiresInSeconds },
    );

    this.logger.info(
      { deviceId: device.id, deviceSerial: dto.deviceSerial },
      'Device registered successfully',
    );

    return {
      deviceId: device.id,
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getDevices(whereObj: any, orderObj: any, selectObj: string[], page: number, limit: number) {
    const { buildDrizzleWhere, buildDrizzleOrderBy, buildDrizzleSelect } = require('../../common/utils/query-parser.util');
    const { sessions } = require('../session/entities/session.entity');
    const { count, sql } = require('drizzle-orm');

    const whereClause = buildDrizzleWhere(devices, whereObj);
    const orderClauses = buildDrizzleOrderBy(devices, orderObj);
    
    // Check if sessionCount is requested in selectObj
    const includeSessionCount = selectObj && selectObj.includes('sessionCount');
    let dbSelectObj = buildDrizzleSelect(devices, selectObj);
    
    if (includeSessionCount) {
      dbSelectObj = dbSelectObj || { ...devices };
      dbSelectObj.sessionCount = sql<number>`cast(count(${sessions.id}) as integer)`;
    }

    let query: any = this.db.select(dbSelectObj).from(devices).$dynamic();

    if (includeSessionCount) {
      query = query.leftJoin(sessions, eq(devices.id, sessions.deviceId)).groupBy(devices.id);
    }

    if (whereClause) {
      query = query.where(whereClause);
    }

    if (orderClauses.length > 0) {
      query = query.orderBy(...orderClauses);
    } else {
      query = query.orderBy(desc(devices.createdAt)); // default order
    }

    const data = await query.limit(limit).offset((page - 1) * limit);
    
    // For total count
    let totalQuery = this.db.select({ count: count() }).from(devices).$dynamic();
    if (whereClause) {
      totalQuery = totalQuery.where(whereClause);
    }
    const totalResult = await totalQuery;
    const total = totalResult[0]!.count;

    return { data, total, page, limit };
  }

  async findById(id: string): Promise<DeviceEntity> {
    const device = await this.db.select().from(devices).where(eq(devices.id, id)).limit(1);

    if (device.length === 0) {
      throw new DeviceNotFoundError(id);
    }

    return device[0]!;
  }

  async updateHeartbeat(deviceId: string, data: HeartbeatUpdateData): Promise<void> {
    await this.db.update(devices)
      .set({
        lastHeartbeatAt: new Date(),
        batteryLevel: data.batteryLevel,
        bleConnected: data.bleConnected,
        flashUsagePercent: data.flashUsagePercent,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, deviceId));
  }
}
