import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { Socket } from 'socket.io';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { JwtService } from '@nestjs/jwt';

import { AudioIngestionService } from './audio-ingestion.service';
import { AllWsExceptionsFilter } from '../../common/filters/ws-exception.filter';
import { AudioPacketDto } from './dto/audio-packet.dto';
import { HealthMetricDto } from '../health/dto/health-metric.dto';
import { HealthService } from '../health/health.service';
import { AssistantService } from '../assistant/assistant.service';

@WebSocketGateway({ cors: true, namespace: '/device' })
@UseFilters(AllWsExceptionsFilter)
export class AudioIngestionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly ingestionService: AudioIngestionService,
    private readonly healthService: HealthService,
    private readonly assistantService: AssistantService,
    @InjectPinoLogger(AudioIngestionGateway.name)
    private readonly logger: PinoLogger,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    const authHeader =
      client.handshake.headers.authorization || (client.handshake.auth?.token as string);
    if (!authHeader) {
      this.logger.warn({ id: client.id }, 'Connection rejected: Missing token');
      client.disconnect();
      return;
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    try {
      const payload = this.jwtService.verify(token);

      const deviceId = payload['deviceId'] as string;
      const userId = payload['userId'] as string;
      if (!deviceId || !userId) {
        throw new Error('No deviceId or userId in token');
      }

      client.data['deviceId'] = deviceId;
      client.data['userId'] = userId;
      this.logger.info({ deviceId, clientId: client.id }, 'Device connected via WS');
    } catch (err) {
      this.logger.warn({ id: client.id, err }, 'Connection rejected: Invalid token');
      client.emit('auth_error', { message: 'jwt expired' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const deviceId = client.data['deviceId'];
    if (deviceId) {
      this.logger.info({ deviceId, clientId: client.id }, 'Device disconnected from WS');
    }
  }

  @SubscribeMessage('audio:packet')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleAudioPacket(
    @ConnectedSocket() client: Socket,
    @MessageBody() packet: AudioPacketDto,
  ): Promise<{ status: string; packetId?: string; answer?: string }> {
    const deviceId = client.data['deviceId'];
    const userId = client.data['userId'];
    if (!deviceId || !userId) {
      client.disconnect();
      return { status: 'error' };
    }

    if (packet.payloadType === 'ACTIVE_QUERY') {
      // Fast path: Route to Jabbel Assistant
      this.logger.info({ sessionId: packet.sessionId }, 'Received ACTIVE_QUERY payload');

      // We still ingest the packet so the audio is saved for the Slow Path (Observations generation)
      await this.ingestionService.ingestPacket(deviceId, userId, packet);

      // Now process synchronously for the assistant
      try {
        const answer = await this.assistantService.processActiveQuery(
          deviceId,
          userId,
          packet.payload,
          packet.sessionId,
          packet.sequenceNo,
        );
        // Return the answer to the client instantly
        return { status: 'accepted', answer };
      } catch (e) {
        this.logger.error(e, 'Failed to process ACTIVE_QUERY');
        return { status: 'error', answer: 'Jabbel is unavailable.' };
      }
    }

    const packetId = await this.ingestionService.ingestPacket(deviceId, userId, packet);
    return { status: 'accepted', packetId };
  }

  @SubscribeMessage('audio:packets:batch')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleAudioPacketBatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() batch: { packets: AudioPacketDto[] },
  ): Promise<{ status: string; count: number }> {
    const deviceId = client.data['deviceId'];
    const userId = client.data['userId'];
    if (!deviceId || !userId) {
      client.disconnect();
      return { status: 'error', count: 0 };
    }

    let ingested = 0;
    for (const packet of batch.packets) {
      try {
        await this.ingestionService.ingestPacket(deviceId, userId, packet);
        ingested++;
      } catch (e) {
        this.logger.error(
          { error: e, sequenceNo: packet.sequenceNo },
          'Failed to ingest batched packet',
        );
      }
    }
    return { status: 'accepted', count: ingested };
  }

  /**
   * Health metrics batch from the mobile app (read from Health Connect after BLE sync).
   * Reuses the already-authenticated deviceId from the socket connection.
   * Emitted by the Expo app as:  socket.emit('health:metrics:batch', { metrics: [...] })
   */
  @SubscribeMessage('health:metrics:batch')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleHealthMetricsBatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { metrics: HealthMetricDto[] },
  ): Promise<{ status: string; saved: number }> {
    const deviceId = client.data['deviceId'] as string | undefined;
    const userId = client.data['userId'] as string | undefined;
    if (!deviceId || !userId) {
      client.disconnect();
      return { status: 'error', saved: 0 };
    }

    const saved = await this.healthService.saveBatch(deviceId, userId, body.metrics ?? []);
    return { status: 'accepted', saved };
  }
}
