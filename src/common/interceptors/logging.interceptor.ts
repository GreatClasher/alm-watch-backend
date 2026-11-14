import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @InjectPinoLogger(LoggingInterceptor.name)
    private readonly logger: PinoLogger,
    @Optional()
    private readonly contextService?: RequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const startMs = Date.now();

    const requestId = this.contextService?.getRequestId();
    const traceId = this.contextService?.getTraceId();
    const deviceId = this.contextService?.getDeviceId();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.info(
            {
              method: req.method,
              url: req.url,
              statusCode: res.statusCode,
              durationMs: Date.now() - startMs,
              requestId,
              traceId,
              deviceId,
            },
            'HTTP request completed',
          );
        },
        error: (err: unknown) => {
          this.logger.error(
            {
              method: req.method,
              url: req.url,
              durationMs: Date.now() - startMs,
              requestId,
              traceId,
              deviceId,
              error: err instanceof Error ? err.message : String(err),
            },
            'HTTP request failed',
          );
        },
      }),
    );
  }
}
