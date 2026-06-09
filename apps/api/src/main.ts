import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { env } from './env.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: { origin: env.WEB_URL, credentials: true } });
  app.use(cookieParser());
  app.enableShutdownHooks();
  const port = Number(new URL(env.API_URL).port) || 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Aegis API listening on :${port}`);
}

void bootstrap();
