import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

import { AppModule } from './app.module';
import { getDeploymentEnvironment, readPort } from './common/environment';
import { requestLoggingMiddleware } from './common/request-logging.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.use(requestLoggingMiddleware);

  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.removeHeader('X-Powered-By');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const corsOrigins = (configService.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (corsOrigins.length > 0) {
    app.enableCors({
      origin: corsOrigins,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      credentials: false,
    });
  }

  const host = configService.get<string>('APP_HOST', '0.0.0.0');
  const port = readPort(
    configService.get<string>('APP_PORT'),
    'APP_PORT',
    3000,
  );

  await app.listen(port, host);

  logger.log(
    JSON.stringify({
      event: 'application_started',
      environment: getDeploymentEnvironment(configService),
      port,
    }),
  );
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');

  logger.error(
    JSON.stringify({
      event: 'application_start_failed',
      errorType: error instanceof Error ? error.name : 'UnknownError',
    }),
  );
  process.exitCode = 1;
});
