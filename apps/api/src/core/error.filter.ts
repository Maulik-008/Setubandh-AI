import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { AppError, ERROR_CODES, type ErrorCode, type ErrorResponse } from '@setubandh/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = Object.fromEntries(
  Object.entries(ERROR_CODES).map(([code, spec]) => [spec.status, code as ErrorCode]),
);

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
  void reply.status(error.status).header('x-request-id', requestId).send(body);
}
