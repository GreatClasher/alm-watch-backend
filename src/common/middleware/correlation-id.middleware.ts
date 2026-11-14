import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly contextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const rawReqId = req.headers['x-request-id'];
    const requestId =
      typeof rawReqId === 'string' && rawReqId.trim().length > 0 ? rawReqId : randomUUID();

    const traceparent = req.headers['traceparent'];
    let traceId = requestId;

    if (typeof traceparent === 'string') {
      const parts = traceparent.trim().split('-');
      if (parts.length >= 4 && parts[1] && parts[1].length === 32) {
        traceId = parts[1];
      }
    }

    res.setHeader('X-Request-Id', requestId);

    const startMs = Date.now();
    res.on('finish', () => {
      const elapsedMs = Date.now() - startMs;
      try {
        res.setHeader('X-Response-Time', `${elapsedMs}ms`);
      } catch {
        // Headers already sent
      }
    });

    this.contextService.run({ requestId, traceId }, () => {
      next();
    });
  }
}
