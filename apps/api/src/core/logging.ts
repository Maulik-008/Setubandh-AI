import type { IncomingMessage } from 'node:http';
import { Global, Module } from '@nestjs/common';
import { LoggerModule, type Params } from 'nestjs-pino';
import type { Options } from 'pino-http';
import type { DestinationStream } from 'pino';
import { ENV, type AppEnv } from './env';

/** Log destination (tests override it to capture logs); `null` means stdout. */
export const LOG_DESTINATION = Symbol('LOG_DESTINATION');

@Global()
@Module({ providers: [{ provide: LOG_DESTINATION, useValue: null }], exports: [LOG_DESTINATION] })
export class LogDestinationModule {}

/** Paths never written to logs (rule 7: no secrets, tokens or message bodies). */
export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-hub-signature-256"]',
  'req.headers["x-razorpay-signature"]',
  'req.headers["stripe-signature"]',
  'res.headers["set-cookie"]',
];

type TenantRequest = IncomingMessage & { id?: string; tenantId?: string };

/**
 * Structured JSON logs (Pino). Every line carries requestId and, once auth lands, tenantId.
 * Request bodies are never logged; health probes are not logged.
 */
export const LoggingModule = LoggerModule.forRootAsync({
  imports: [LogDestinationModule],
  inject: [ENV, LOG_DESTINATION],
  useFactory: (env: AppEnv, destination: DestinationStream | null): Params => {
    const level =
      env.NODE_ENV === 'production'
        ? 'info'
        : env.NODE_ENV === 'test' && !destination
          ? 'silent'
          : 'debug';
    const pretty = env.NODE_ENV === 'development' && !destination;
    const options: Options = {
      level,
      redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
      customProps: (req: IncomingMessage) => {
        const { id, tenantId } = req as TenantRequest;
        return { requestId: id, tenantId };
      },
      serializers: {
        req: (req: { id: string; method: string; url: string; headers: unknown }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          headers: req.headers,
        }),
      },
      autoLogging: {
        ignore: (req: IncomingMessage) => req.url?.startsWith('/health/') ?? false,
      },
      ...(pretty ? { transport: { target: 'pino-pretty', options: { singleLine: true } } } : {}),
    };
    return { pinoHttp: destination ? [options, destination] : options };
  },
});
