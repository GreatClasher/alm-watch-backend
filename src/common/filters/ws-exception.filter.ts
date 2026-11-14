import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class AllWsExceptionsFilter extends BaseWsExceptionFilter {
  constructor(private readonly logger?: PinoLogger) {
    super();
  }

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

    const traceId = client.data ? client.data['traceId'] : undefined;

    if (this.logger) {
      this.logger.error({ traceId, err: message }, 'WS Exception caught');
    } else {
      console.error('WS Exception caught:', { traceId, message });
    }

    client.emit('exception', {
      error: {
        code: 'WS_ERROR',
        message,
        timestamp: new Date().toISOString(),
        traceId,
      },
    });
  }
}
