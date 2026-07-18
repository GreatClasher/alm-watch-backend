import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Global HTTP exception filter.
 * Returns a consistent error JSON shape for all HTTP errors.
 * Never leaks internal stack traces to clients.
 */
@Catch()
export class AllHttpExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as string | Record<string, unknown>)
        : 'Internal server error';

    const errorCode =
      exception instanceof HttpException
        ? resolveErrorCode(exception.getStatus())
        : 'INTERNAL_ERROR';

    response.status(status).json({
      error: {
        code: errorCode,
        message: typeof message === 'string' ? message : extractMessage(message),
        details: typeof message === 'object' ? message : undefined,
        requestId: request.headers['x-request-id'],
        timestamp: new Date().toISOString(),
      },
    });
  }
}

function resolveErrorCode(status: number): string {
  const codes: Record<number, string> = {
    400: 'INVALID_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'CHECKSUM_MISMATCH',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_ERROR',
  };
  return codes[status] ?? 'INTERNAL_ERROR';
}

function extractMessage(obj: Record<string, unknown>): string {
  if (typeof obj['message'] === 'string') return obj['message'];
  if (Array.isArray(obj['message'])) return (obj['message'] as string[]).join(', ');
  return 'An error occurred';
}
