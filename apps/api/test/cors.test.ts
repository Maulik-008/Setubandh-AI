import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { testEnv } from '@setubandh/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootApi } from './support/app';

// M1-13: the web app on APP_URL calls the API on its own host, with the refresh cookie.
describe('CORS', () => {
  let app: NestFastifyApplication;
  const appOrigin = new URL(testEnv().APP_URL ?? '').origin;
  beforeAll(async () => {
    app = await bootApi();
  });
  afterAll(async () => {
    await app.close();
  });

  it('allows the web app origin with credentials and the workspace header', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/v1/members',
      headers: {
        origin: appOrigin,
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization,x-workspace-id',
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(appOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(String(res.headers['access-control-allow-headers'])).toContain('x-workspace-id');
  });

  it('gives no CORS grant to any other origin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: { origin: 'https://evil.example' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
