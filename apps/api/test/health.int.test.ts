import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { freePort } from '@setubandh/testing';
import { afterEach, describe, expect, inject, it } from 'vitest';
import { bootApi } from './support/app';

// M1-03 acceptance: /health/ready checks the real Postgres and Valkey.
describe('/health/ready against real Postgres 18 and Valkey 8.1', () => {
  let app: NestFastifyApplication | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it('answers 200 when both are reachable', async () => {
    app = await bootApi({ DATABASE_URL: inject('postgresUrl'), REDIS_URL: inject('valkeyUrl') });
    const res = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', checks: { database: 'up', valkey: 'up' } });
  });

  it('answers 503 when Postgres is unreachable', async () => {
    const closedPort = await freePort();
    app = await bootApi({
      DATABASE_URL: `postgres://nobody:nothing@127.0.0.1:${closedPort}/none`,
      REDIS_URL: inject('valkeyUrl'),
    });
    const res = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.json<{ error: { details: unknown } }>().error.details).toEqual({
      checks: { database: 'down', valkey: 'up' },
    });
  });

  it('answers 503 when Valkey is unreachable', async () => {
    const closedPort = await freePort();
    app = await bootApi({
      DATABASE_URL: inject('postgresUrl'),
      REDIS_URL: `redis://127.0.0.1:${closedPort}`,
    });
    const res = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.json<{ error: { details: unknown } }>().error.details).toEqual({
      checks: { database: 'up', valkey: 'down' },
    });
  });
});
