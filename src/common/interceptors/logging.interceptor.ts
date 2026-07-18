import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

/**
 * Logging interceptor — logs request/response metadata for every HTTP call.
 * Does not log request body to avoid logging sensitive audio data.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @InjectPinoLogger(LoggingInterceptor.name)
    private readonly logger: PinoLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const startMs = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.info(
            {
              method: req.method,
              url: req.url,
              statusCode: res.statusCode,
              durationMs: Date.now() - startMs,
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
              error: err instanceof Error ? err.message : String(err),
            },
            'HTTP request failed',
          );
        },
      }),
    );
  }
}
