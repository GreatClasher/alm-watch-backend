import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

/**
 * Global WebSocket exception filter.
 * Catches all exceptions thrown in WS handlers and emits a structured error event to the client.
 * Never leaks stack traces to clients.
 */
@Catch()
export class AllWsExceptionsFilter extends BaseWsExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();

    const message =
      exception instanceof WsException
        ? exception.message
        : (exception as any).getResponse?.()
          ? (exception as any).getResponse()
          : exception instanceof Error
            ? exception.message
            : 'Internal server error';

    console.error('WS Exception caught:', message);

    client.emit('exception', {
      error: {
        code: 'WS_ERROR',
        message,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
