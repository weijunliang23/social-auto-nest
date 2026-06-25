import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { AppConfig } from './config/app-config.interface';
import appConfig from './config/app.config';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfig>(appConfig.KEY);

  app.enableCors();
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Social Auto Upload API')
    .setDescription(
      'social-auto-upload NestJS 后端接口文档，兼容原 Flask 路由',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(config.port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`sau_backend_nest listening on http://0.0.0.0:${config.port}`);
  logger.log(`Swagger UI: http://0.0.0.0:${config.port}/api`);
  logger.log(
    `localChromeHeadless=${config.localChromeHeadless} debugMode=${config.debugMode}`,
  );
}

void bootstrap();
