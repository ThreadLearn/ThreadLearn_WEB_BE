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
  app.use(compression());
  app.use('/uploads', express.static(join(process.cwd(), env.UPLOAD_DIR)));
  app.enableCors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: !corsOrigins.includes('*'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
