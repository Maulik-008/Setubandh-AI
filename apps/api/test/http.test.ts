import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from '@setubandh/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('api over HTTP (NestJS on Fastify, injected requests)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp({ imports: [AppModule] });
  });

  afterAll(async () => {
    await app.close();
  });

  it('boots on the Fastify adapter', () => {
    expect(app.getHttpAdapter().getType()).toBe('fastify');
  });

  it('answers an unknown route with a 404 JSON body', async () => {
    const response = await app.inject({ method: 'GET', url: '/does-not-exist' });
    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toMatchObject({ statusCode: 404 });
  });
});
