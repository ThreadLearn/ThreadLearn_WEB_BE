import { DocumentBuilder } from '@nestjs/swagger';

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
