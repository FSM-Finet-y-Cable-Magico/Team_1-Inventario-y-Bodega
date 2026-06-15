import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger: Logger = new Logger('main');
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      timestamp: false,
      colors: true,
      prefix: 'API',
      compact: true,
    }),
  });

  // * -- Configuration.
  const configService = app.get(ConfigService);
  const PORT: number = configService.get<number>('PORT')!;

  app.setGlobalPrefix('api/');
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  // * -- Start.
  await app.listen(PORT).then(() => {
    logger.log('* Inventory API');
    logger.log(`🚩 API is running on: http://localhost:${PORT}/api`);
  });
}

void bootstrap();
