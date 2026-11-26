import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import type { AppEnv } from './core/env';
import { requestIdFor } from './core/request-id';
import { setupOpenApi } from './core/openapi';

/** Routes that live outside /v1 (infrastructure probes). */
export const UNVERSIONED_ROUTES = ['health/live', 'health/ready'];

/** The Fastify adapter used by main.ts and by API tests. */
export function createFastifyAdapter(): FastifyAdapter {
  return new FastifyAdapter({
    genReqId: requestIdFor,
    requestIdHeader: false,
    trustProxy: true,
    bodyLimit: 1024 * 1024,
  });
}

/** App-level setup shared by main.ts and API tests, so tests exercise the real configuration. */
export async function configureApp(app: NestFastifyApplication, env: AppEnv): Promise<void> {
  await app.register(fastifyCookie);
  // The web app (APP_URL) calls the API on its own host (requirements §4.4): allow exactly that
  // origin, with credentials so the httpOnly refresh cookie travels with /v1/auth/refresh.
  await app.register(fastifyCors, {
    origin: [new URL(env.APP_URL).origin],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['content-type', 'authorization', 'x-workspace-id', 'x-request-id'],
    exposedHeaders: ['x-request-id', 'retry-after'],
    maxAge: 600,
  });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('v1', { exclude: UNVERSIONED_ROUTES });
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', (request, reply, done) => {
      void reply.header('x-request-id', request.id);
      done();
    });
  if (env.NODE_ENV !== 'production') setupOpenApi(app);
}
