import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { AppError, type ErrorCode, type ErrorResponse } from '@setubandh/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

/** Generic codes for framework errors that carry only an HTTP status (never domain codes). */
const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'VALIDATION_FAILED',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
};

/** Turn any thrown value into an AppError, never exposing internals of unexpected errors. */
export function toAppError(exception: unknown): AppError {
  if (exception instanceof AppError) return exception;
  const status =
    exception instanceof HttpException
      ? exception.getStatus()
      : typeof (exception as { statusCode?: unknown })?.statusCode === 'number'
        ? (exception as { statusCode: number }).statusCode
        : 500;
  const code = CODE_BY_STATUS[status] ?? (status >= 500 ? 'INTERNAL' : 'BAD_REQUEST');
  return new AppError(code, { cause: exception });
}

/**
 * The single place errors become responses: `{ error: { code, message, details, requestId } }`
 * (requirements §12.1). Unexpected errors are logged with their stack and answered as INTERNAL.
 */
@Catch()
export class AppErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const error = toAppError(exception);
    if (error.status >= 500) {
      this.logger.error(
        { err: exception, code: error.code },
        exception instanceof Error ? exception.message : 'Non-error thrown',
      );
    }
    sendError(reply, request.id, error);
  }
}

export function sendError(reply: FastifyReply, requestId: string, error: AppError): void {
  const body: ErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      requestId,
    },
  };
  const retryAfter = error.details?.retryAfterSeconds;
  if (typeof retryAfter === 'number') void reply.header('retry-after', String(retryAfter));
  void reply.status(error.status).header('x-request-id', requestId).send(body);
}
