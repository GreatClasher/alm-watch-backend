import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import type { Request } from 'express';

import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

interface DeviceJwtPayload {
  sub: string;
  userId: string;
  deviceId: string;
  iss: string;
  aud: string | string[];
  iat: number;
  exp: number;
}

function isDeviceJwtPayload(payload: unknown): payload is DeviceJwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as Record<string, unknown>)['sub'] === 'string' &&
    typeof (payload as Record<string, unknown>)['deviceId'] === 'string' &&
    typeof (payload as Record<string, unknown>)['userId'] === 'string'
  );
}

/**
 * Guard that validates RS256 JWT on both HTTP and WebSocket connections.
 */
@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(
    @InjectPinoLogger(DeviceAuthGuard.name)
    private readonly logger: PinoLogger,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const type = context.getType<string>();

    if (type === 'ws') {
      return this.validateWebSocket(context);
    }

    return this.validateHttp(context);
  }

  private validateHttp(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { deviceId?: string; userId?: string }>();
    const authHeader = request.headers['authorization'];

    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Missing token' });
    }

    const token = authHeader.slice(7);
    const payload = this.verifyToken(token);
    request.deviceId = payload.deviceId;
    request.userId = payload.userId;
    return true;
  }

  private validateWebSocket(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const token = client.handshake.auth['token'] as unknown;

    if (typeof token !== 'string') {
      client.disconnect(true);
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Missing token' });
    }

    const payload = this.verifyToken(token);
    client.data['deviceId'] = payload.deviceId;
    client.data['userId'] = payload.userId;
    return true;
  }

  private verifyToken(token: string): DeviceJwtPayload {
    try {
      const payload = this.jwtService.verify(token);

      if (!isDeviceJwtPayload(payload)) {
        throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid token payload' });
      }

      return payload;
    } catch (err) {
      this.logger.warn(
        { error: err instanceof Error ? err.message : String(err) },
        'JWT verification failed',
      );
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
    }
  }
}
