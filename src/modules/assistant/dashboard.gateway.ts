import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@WebSocketGateway({
  namespace: '/dashboard',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
  transports: ['websocket', 'polling'],
})
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    @InjectPinoLogger(DashboardGateway.name)
    private readonly logger: PinoLogger,
  ) {}

  handleConnection(client: Socket) {
    this.logger.info({ clientId: client.id }, 'Dashboard UI connected via WS');
  }

  handleDisconnect(client: Socket) {
    this.logger.info({ clientId: client.id }, 'Dashboard UI disconnected from WS');
  }

  /**
   * Broadcast a Fast Lane interaction to all connected dashboard clients
   */
  broadcastFastLaneInteraction(payload: { query: string; answer: string; timestamp: string }) {
    this.server.emit('fastlane:interaction', payload);
  }
}
