import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port') ?? 3000;
  const apiPrefix = config.get<string>('app.apiPrefix') ?? 'api/v1';
  const corsOrigins = config.get<string[]>('app.corsOrigins') ?? ['http://localhost:4200'];
  const appName = config.get<string>('app.name') ?? 'Cardify AI';
  const swaggerEnabled = config.get<boolean>('swagger.enabled') ?? true;
  const swaggerPath = config.get<string>('swagger.path') ?? 'api-docs';

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RequestIdInterceptor(), new LoggingInterceptor());

  if (swaggerEnabled) {
    const docConfig = new DocumentBuilder()
      .setTitle(`${appName} API`)
      .setDescription(
        'AI Product Card Generator + AI Interview Scorecard Engine built with NestJS 11, MongoDB & Google Gemini Free API.',
      )
      .setVersion('1.0.0')
      .addTag('Runs', 'Generate, score, regenerate, transform, and analyze product cards')
      .addTag('Analytics', 'Aggregated run metrics and winning tone insights')
      .addTag('Health', 'Service and database health probes')
      .build();

    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup(swaggerPath, app, document);
  }

  await app.listen(port);
}

void bootstrap();
