import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module.js';
import { env } from './env.js';
import { OpsService } from './ops/ops.service.js';
import { AllExceptionsFilter } from './ops/all-exceptions.filter.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: { origin: env.WEB_URL, credentials: true },
  });
  // Security headers. CSP is disabled because this is a JSON/markdown API (CSP is a
  // browser-document control); the rest (nosniff, frame-deny, HSTS, etc.) still apply.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  // Request-id: accept the caller's X-Request-Id or mint one; echo it on the
  // response and propagate it to downstream services for cross-service correlation.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    req.headers['x-request-id'] = id;
    res.setHeader('x-request-id', id);
    next();
  });
  app.useGlobalFilters(new AllExceptionsFilter(app.get(OpsService)));
  app.enableShutdownHooks();
  const port = Number(new URL(env.API_URL).port) || 3001;
  await app.listen(port);
  new Logger('Bootstrap').log(`Aegis API listening on :${port}`);
}

void bootstrap();
