import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request & { userId?: string }>();
    const userId = request.userId;

    if (typeof userId !== 'string') {
      throw new Error('UserId not found on request — ensure DeviceAuthGuard is applied');
    }

    return userId;
  },
);
