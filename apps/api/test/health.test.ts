import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { errorResponseSchema } from '@setubandh/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { DATABASE_HEALTH, VALKEY_HEALTH, type HealthProbe } from '../src/modules/health';
import { bootApi } from './support/app';

const up: HealthProbe = { check: () => Promise.resolve() };
const down: HealthProbe = {
  check: () => Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:5432 password=secret')),
};
const hanging: HealthProbe = { check: () => new Promise(() => undefined) };

describe('health endpoints (requirements §15.2)', () => {
  let app: NestFastifyApplication | undefined;
  const boot = (database: HealthProbe, valkey: HealthProbe) =>
    bootApi({}, (b) =>
      b
        .overrideProvider(DATABASE_HEALTH)
        .useValue(database)
        .overrideProvider(VALKEY_HEALTH)
        .useValue(valkey),
    ).then((a) => (app = a));

  afterEach(async () => {
    await app?.close();
  });

  it('GET /health/live answers 200 without touching dependencies', async () => {
    await boot(down, down);
    const res = await app!.inject({ method: 'GET', url: '/health/live' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /health/ready answers 200 when Postgres and Valkey are up', async () => {
    await boot(up, up);
    const res = await app!.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', checks: { database: 'up', valkey: 'up' } });
  });

  it('answers 503 SERVICE_UNAVAILABLE naming the failing dependency, without its error text', async () => {
    await boot(down, up);
    const res = await app!.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(503);
    const body = errorResponseSchema.parse(res.json());
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error.details).toEqual({ checks: { database: 'down', valkey: 'up' } });
    expect(res.body).not.toContain('secret');
  });

  it('treats a check that does not answer in time as down', async () => {
    await boot(up, hanging);
    const res = await app!.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.json<{ error: { details: unknown } }>().error.details).toEqual({
      checks: { database: 'up', valkey: 'down' },
    });
  }, 10_000);

  it('is not under /v1', async () => {
    await boot(up, up);
    expect((await app!.inject({ method: 'GET', url: '/v1/health/live' })).statusCode).toBe(404);
  });
});
