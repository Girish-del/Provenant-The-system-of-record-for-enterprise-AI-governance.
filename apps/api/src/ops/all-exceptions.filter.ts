import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { OpsService } from './ops.service.js';

/**
 * Global exception filter: 4xx pass through untouched; unexpected errors are
 * reported to Sentry (no-op without DSN) and returned as a sanitized 500 that
 * carries the request id for support correlation — never a stack trace.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  constructor(private readonly ops: OpsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? 'unknown';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res.status(status).json(typeof body === 'string' ? { message: body, statusCode: status } : body);
      return;
    }

    this.logger.error(
      `unhandled error on ${req.method} ${req.url} [${requestId}]`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    this.ops.captureError(exception, { method: req.method, url: req.url, requestId });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      message: 'internal server error',
      requestId,
    });
  }
}
