import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { bootApi } from './support/app';

describe('OpenAPI docs (requirements §12.1)', () => {
  let app: NestFastifyApplication | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it('serves an OpenAPI 3.1 document generated from Zod schemas outside production', async () => {
    app = await bootApi({ NODE_ENV: 'development' });
    const res = await app.inject({ method: 'GET', url: '/v1/docs/openapi.json' });
    expect(res.statusCode).toBe(200);
    const doc = res.json<{
      openapi: string;
      paths: Record<string, unknown>;
      components: { schemas: { ErrorResponse: { properties: { error: { required: string[] } } } } };
    }>();
    expect(doc.openapi).toMatch(/^3\.1\./);
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining(['/health/live', '/health/ready']),
    );
    expect(doc.components.schemas.ErrorResponse.properties.error.required).toEqual(
      expect.arrayContaining(['code', 'message', 'requestId']),
    );
  });

  it('serves the interactive docs page outside production', async () => {
    app = await bootApi({ NODE_ENV: 'development' });
    const res = await app.inject({ method: 'GET', url: '/v1/docs' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
  });

  it('does not expose docs in production', async () => {
    app = await bootApi({ NODE_ENV: 'production' });
    expect((await app.inject({ method: 'GET', url: '/v1/docs' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/v1/docs/openapi.json' })).statusCode).toBe(
      404,
    );
  });
});
