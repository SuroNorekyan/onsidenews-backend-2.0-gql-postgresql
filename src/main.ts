import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

async function bootstrap() {
  const expressApp = express(); // ✅ force Express adapter
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    origin: 'http://localhost:3001', // ✅ frontend port
    credentials: true, // if you're using cookies / auth
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
