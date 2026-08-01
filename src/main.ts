import 'reflect-metadata';
import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { connectToDatabase } from './configs/db';
import { env } from './configs/env';
import { logger } from './configs/logger';
import {  setupSwagger } from './swagger/config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  await connectToDatabase();

  const app = await NestFactory.create(AppModule);
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : env.FRONTEND_URL;
  const uploadCorsOrigins =
    process.env.CORS_ORIGIN || process.env.FRONTEND_URL
      ? corsOrigins
      : Array.from(new Set([...corsOrigins, 'http://localhost:3001']));

  app.setGlobalPrefix('api');

  // Thêm middleware log request (method, url, status, duration ms)
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      logger.info(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`);
    });
    next();
  });

  app.use(helmet());
  app.use(
    compression({
      filter: (req, res) => {
        if (req.path.includes('/analyze/stream')) return false;
        return compression.filter(req, res);
      },
    }),
  );
  app.use(
    '/uploads',
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const requestOrigin = req.headers.origin;

      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      if (uploadCorsOrigins.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
      } else if (requestOrigin && uploadCorsOrigins.includes(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        res.setHeader('Vary', 'Origin');
      } else {
        res.setHeader('Access-Control-Allow-Origin', uploadCorsOrigins[0] ?? 'http://localhost:3001');
        res.setHeader('Vary', 'Origin');
      }

      next();
    },
    express.static(join(process.cwd(), env.UPLOAD_DIR))
  );
  app.enableCors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: !corsOrigins.includes('*'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Quiz submission carries an idempotency key so a retried request cannot
    // create a second attempt. Keep this whitelist in sync with API clients,
    // otherwise browsers reject the preflight request before it reaches Nest.
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  ); 
  app.useGlobalFilters(new GlobalExceptionFilter());

  setupSwagger(app); // Set up Swagger documentation
  
  await app.listen(env.PORT, '0.0.0.0');
  logger.info(`ThreadLearn NestJS server is running at http://localhost:${env.PORT}`);
  logger.info(`Swagger UI is available at http://localhost:${env.PORT}/api/docs`);
}

bootstrap();
