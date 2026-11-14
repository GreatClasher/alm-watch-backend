import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import * as fs from 'fs';

import { RequestContextService } from './common/context/request-context.service';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

import { DatabaseModule } from './database/database.module';
import { DeviceModule } from './modules/device/device.module';
import { AudioIngestionModule } from './modules/audio-ingestion/audio-ingestion.module';
import { SessionModule } from './modules/session/session.module';
import { HeartbeatModule } from './modules/heartbeat/heartbeat.module';
import { OtaModule } from './modules/ota/ota.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { AiOrchestratorModule } from './modules/ai-orchestrator/ai-orchestrator.module';
import { HealthDataModule } from './modules/health/health.module';
import { HealthController } from './health/health.controller';
import { BullModule } from '@nestjs/bullmq';

// ALM Layer Modules
import { RecordingModule } from './modules/recording/recording.module';
import { SensorFrameModule } from './modules/sensor-frame/sensor-frame.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { ObservationModule } from './modules/observation/observation.module';
import { ContextModule } from './modules/context/context.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { EpisodeModule } from './modules/episode/episode.module';
import { MemoryModule } from './modules/memory/memory.module';
import { LlmModule } from './modules/llm/llm.module';
import { ConsolidationModule } from './modules/consolidation/consolidation.module';
import { QueryModule } from './modules/query/query.module';

import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AssistantModule } from './modules/assistant/assistant.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL', 'info'),
          ...(config.get<string>('NODE_ENV') === 'development' && {
            transport: { target: 'pino-pretty', options: { colorize: true } },
          }),
          autoLogging: {
            ignore: (req: any) => {
              const url = req.url || '';
              return url.includes('/queue-status') || url.includes('/dashboard/stats');
            },
          },
          redact: ['req.headers.authorization'],
          serializers: {
            req: (req: any) => ({ id: req.id, method: req.method, url: req.url }),
            res: (res: any) => ({ statusCode: res.statusCode }),
          },
        },
      }),
    }),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const keyPath = config.get<string>('JWT_PUBLIC_KEY_PATH');
        let publicKey = '';
        if (keyPath) {
          try {
            publicKey = await fs.promises.readFile(keyPath, 'utf-8');
          } catch (e) {
            // ignore
          }
        }
        return {
          publicKey,
          verifyOptions: {
            algorithms: ['RS256'],
            issuer: 'jabbelpin-api',
            audience: 'jabbelpin-device',
          },
        };
      },
    }),
    // Legacy modules (kept for backward compat during migration)
    DeviceModule,
    AudioIngestionModule,
    SessionModule,
    HeartbeatModule,
    OtaModule,
    MetricsModule,
    AiOrchestratorModule,
    HealthDataModule,
    // ALM Layer modules
    RecordingModule,
    SensorFrameModule,
    PipelineModule,
    ObservationModule,
    ContextModule,
    ConversationModule,
    EpisodeModule,
    MemoryModule,
    LlmModule,
    ConsolidationModule,
    QueryModule,
    DashboardModule,
    AssistantModule,
  ],
  controllers: [HealthController],
  providers: [
    RequestContextService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
