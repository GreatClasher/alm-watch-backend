import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AllWsExceptionsFilter } from './common/filters/ws-exception.filter';
import { AllHttpExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);

  // Global validation — whitelist strips unknown fields, forbidNonWhitelisted throws on extras
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Increase payload size limit for large ML transcript JSONs
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Security headers via Helmet
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));

  // Structured JSON logging via Pino
  app.useLogger(app.get(Logger));

  // Global exception filters
  app.useGlobalFilters(new AllHttpExceptionsFilter());

  // Trust first reverse proxy (needed for correct IP in X-Forwarded-For)
  app.set('trust proxy', 1);

  // API version prefix
  app.setGlobalPrefix('v1', { exclude: ['v1/healthz'] });

  app.enableCors();

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
}

void bootstrap();
