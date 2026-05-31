import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import * as compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const app  = await NestFactory.create(AppModule, { logger: ['log', 'error', 'warn'] });
  const port = process.env.PORT ?? 5000;
  const isProd = process.env.NODE_ENV === 'production';

  // Lesson content embeds 3rd-party video iframes (YouTube/Vimeo).
  // Default Helmet CSP blocks them — relax frameSrc explicitly.
  app.use(helmet({
    contentSecurityPolicy: isProd
      ? {
          useDefaults: true,
          directives: {
            frameSrc:  ["'self'", 'https://www.youtube.com', 'https://player.vimeo.com'],
            imgSrc:    ["'self'", 'data:', 'https:'],
            connectSrc:["'self'", 'https://api.openai.com', 'https://judge0-ce.p.rapidapi.com'],
          },
        }
      : false, // dev: disable CSP so Swagger UI + Vite HMR work cleanly
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());

  app.enableCors({
    origin:      (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: false, // Bearer tokens via Authorization header, no cookies needed
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(new ValidationPipe({
    whitelist:            true,
    transform:            true,
    forbidNonWhitelisted: isProd, // strict in prod, lenient in dev
  }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const docConfig = new DocumentBuilder()
    .setTitle('ThreadLearn API')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, docConfig));

  await app.listen(port);
  new Logger('Bootstrap').log(
    `ThreadLearn NestJS API ready → http://localhost:${port}/api/v1  (docs: /api/docs)`,
  );
}
bootstrap();
