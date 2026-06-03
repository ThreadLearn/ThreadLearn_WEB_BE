// src/swagger/config.ts

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { INestApplication } from '@nestjs/common';
import { registry } from '../common/zod/openapi.registry';

export function createSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('ThreadLearn API Documentation')
    .setDescription(
      'Comprehensive API documentation for the ThreadLearn scalable learning platform backend. Built with NestJS, MongoDB, Redis, and Socket.IO.'
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'BearerAuth'
    )
    .build();
}

export function setupSwagger(app: INestApplication): void {
  const config = createSwaggerConfig();
  const nestDocument = SwaggerModule.createDocument(app, config);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zodDocument = (new OpenApiGeneratorV3(registry.definitions)).generateDocument({
    openapi: '3.0.0',
    info: { title: '', version: '' },
  }) as any;

  nestDocument.components = {
    ...nestDocument.components,
    schemas: {
      ...nestDocument.components?.schemas,
      ...(zodDocument?.components?.schemas ?? {}),
    },
  };

  SwaggerModule.setup('api/docs', app, nestDocument);
}