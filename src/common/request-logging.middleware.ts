import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HttpRequest');
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;

function resolveRequestId(request: Request): string {
  const incomingRequestId = request.header('x-request-id');

  if (incomingRequestId && REQUEST_ID_PATTERN.test(incomingRequestId)) {
    return incomingRequestId;
  }

  return randomUUID();
}

export function requestLoggingMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const startedAt = process.hrtime.bigint();
  const requestId = resolveRequestId(request);
  let logged = false;

  response.setHeader('x-request-id', requestId);

  const logCompletion = (event: 'request_complete' | 'request_aborted') => {
    if (logged) {
      return;
    }

    logged = true;
    const durationMilliseconds =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.log(
      JSON.stringify({
        event,
        requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Number(durationMilliseconds.toFixed(2)),
      }),
    );
  };

  response.once('finish', () => logCompletion('request_complete'));
  response.once('close', () => {
    if (!response.writableFinished) {
      logCompletion('request_aborted');
    }
  });

  next();
}
