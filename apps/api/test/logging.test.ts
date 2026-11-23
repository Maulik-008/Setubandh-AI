import { Writable } from 'node:stream';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LOG_DESTINATION } from '../src/core/logging';
import { bootApi } from './support/app';

describe('api logs (rule 7, requirements §14.6)', () => {
  let app: NestFastifyApplication;
  const lines: Record<string, unknown>[] = [];
  const capture = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      for (const line of chunk.toString().split('\n').filter(Boolean)) lines.push(JSON.parse(line));
      callback();
    },
  });

  beforeAll(async () => {
    app = await bootApi({}, (builder) =>
      builder.overrideProvider(LOG_DESTINATION).useValue(capture),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const requestLog = (requestId: string) =>
    lines.find((line) => line.requestId === requestId && line.req !== undefined);

  it('writes one JSON line per request carrying its requestId', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/does-not-exist' });
    const id = String(res.headers['x-request-id']);
    expect(requestLog(id)).toMatchObject({ requestId: id, res: { statusCode: 404 } });
  });

  it('redacts authorization and cookie headers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/does-not-exist',
      headers: { authorization: 'Bearer secret-token-123', cookie: 'refresh=secret-cookie' },
    });
    const text = JSON.stringify(lines);
    expect(text).not.toContain('secret-token-123');
    expect(text).not.toContain('secret-cookie');
    expect(requestLog(String(res.headers['x-request-id']))).toMatchObject({
      req: { headers: { authorization: '[redacted]', cookie: '[redacted]' } },
    });
  });

  it('never logs request bodies', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/test/echo',
      payload: { name: 'Private Customer Message', email: 'customer@example.com' },
    });
    expect(JSON.stringify(lines)).not.toContain('Private Customer Message');
  });

  it('logs unexpected errors with the stack but returns no internals', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/test/crash' });
    const id = String(res.headers['x-request-id']);
    const errorLine = lines.find((line) => line.level === 50 && line.requestId === id);
    expect(errorLine).toMatchObject({ code: 'INTERNAL', err: { stack: expect.any(String) } });
  });
});
