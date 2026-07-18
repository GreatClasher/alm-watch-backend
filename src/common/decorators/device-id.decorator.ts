import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Parameter decorator to extract deviceId from the request.
 * Only works on HTTP routes protected by DeviceAuthGuard.
 * DeviceId is always sourced from the verified JWT — never from the request body.
 */
export const DeviceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request & { deviceId?: string }>();
    const deviceId = request.deviceId;

    if (typeof deviceId !== 'string') {
      throw new Error('DeviceId not found on request — ensure DeviceAuthGuard is applied');
    }

    return deviceId;
  },
);
