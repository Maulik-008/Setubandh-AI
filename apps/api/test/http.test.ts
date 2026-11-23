import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { errorResponseSchema } from '@setubandh/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootApi } from './support/app';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('api error responses (requirements §12.1)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await bootApi();
  });

  afterAll(async () => {
    await app.close();
  });

  it('boots on the Fastify adapter with routes under /v1', async () => {
    expect(app.getHttpAdapter().getType()).toBe('fastify');
    const res = await app.inject({ method: 'GET', url: '/test/app-error' });
    expect(res.statusCode).toBe(404);
  });

  it('answers an unknown route with 404 NOT_FOUND in the error shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/does-not-exist' });
    expect(res.statusCode).toBe(404);
    const body = errorResponseSchema.parse(res.json());
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('maps an AppError to its status, code, message and details', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/test/app-error' });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to do this.',
        details: { permission: 'members.invite' },
      },
    });
  });

  it('returns 422 VALIDATION_FAILED with field errors for invalid input', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/test/echo',
      payload: { name: '', email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(422);
    const body = errorResponseSchema.parse(res.json());
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.details).toMatchObject({
      fields: { name: expect.any(String), email: expect.any(String) },
    });
  });

  it('passes valid input through to the handler', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/test/echo',
      payload: { name: 'Asha', email: 'asha@example.com', extra: 'dropped' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ name: 'Asha', email: 'asha@example.com' });
  });

  it('hides internal details of unexpected errors behind 500 INTERNAL', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/test/crash' });
    expect(res.statusCode).toBe(500);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('INTERNAL');
    expect(res.body).not.toContain('hunter2');
  });

  it('returns 400 BAD_REQUEST for malformed JSON', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/test/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{"name": ',
    });
    expect(res.statusCode).toBe(400);
    expect(errorResponseSchema.parse(res.json()).error.code).toBe('BAD_REQUEST');
  });

  it('generates a UUIDv7 request id, returns it as a header and in the error body', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/does-not-exist' });
    const header = res.headers['x-request-id'];
    expect(header).toMatch(UUID_V7);
    expect(res.json<{ error: { requestId: string } }>().error.requestId).toBe(header);
  });

  it('reuses a well-formed incoming X-Request-Id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/does-not-exist',
      headers: { 'x-request-id': 'edge-abc123-def456' },
    });
    expect(res.headers['x-request-id']).toBe('edge-abc123-def456');
    expect(res.json<{ error: { requestId: string } }>().error.requestId).toBe('edge-abc123-def456');
  });

  it('replaces a malformed incoming X-Request-Id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/does-not-exist',
      headers: { 'x-request-id': 'bad id\nwith newline' },
    });
    expect(res.headers['x-request-id']).toMatch(UUID_V7);
  });
});
