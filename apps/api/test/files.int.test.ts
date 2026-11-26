import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootAuthApi, type AuthTestApp } from './support/auth-app';

// M1-14 files on real Postgres (RLS) and real S3 (SeaweedFS), through signed URLs.
const PASSWORD = 'correct horse battery staple';

interface Actor {
  token: string;
  workspaceId: string;
}

describe('files: signed upload and download (requirements §5.2, §12.2)', () => {
  let t: AuthTestApp;
  let a: Actor;
  let b: Actor;

  const ip = () => `10.80.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  const call = (
    method: 'GET' | 'POST',
    url: string,
    actor: Actor,
    payload?: object,
    ws = actor.workspaceId,
  ) =>
    t.app.inject({
      method,
      url,
      payload,
      headers: {
        'x-forwarded-for': ip(),
        authorization: `Bearer ${actor.token}`,
        'x-workspace-id': ws,
      },
    });

  async function actor(name: string): Promise<Actor> {
    const email = `${randomUUID()}@example.com`;
    const headers = { 'x-forwarded-for': ip() };
    await t.app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      headers,
      payload: { name, email, password: PASSWORD, workspaceName: name },
    });
    const token = (
      await t.app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        headers,
        payload: { email, password: PASSWORD },
      })
    ).json<{ accessToken: string }>().accessToken;
    const list = await t.app.inject({
      method: 'GET',
      url: '/v1/workspaces',
      headers: { authorization: `Bearer ${token}` },
    });
    return { token, workspaceId: list.json<{ workspaces: { id: string }[] }>().workspaces[0]!.id };
  }

  /** Ask for an upload URL, then PUT the bytes exactly as a browser would. */
  async function upload(
    who: Actor,
    body: Buffer,
    filename = 'invoice.pdf',
    mime = 'application/pdf',
    declaredSize = body.length,
  ) {
    const res = await call('POST', '/v1/files/upload-url', who, {
      purpose: 'attachment',
      filename,
      mime,
      sizeBytes: declaredSize,
    });
    expect(res.statusCode, res.body).toBe(201);
    const ticket = res.json<{
      fileId: string;
      uploadUrl: string;
      headers: Record<string, string>;
    }>();
    const put = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body });
    return { ...ticket, putStatus: put.status };
  }

  beforeAll(async () => {
    t = await bootAuthApi();
    a = await actor('Tenant A');
    b = await actor('Tenant B');
  }, 120_000);

  afterAll(async () => {
    await t?.close();
  });

  it('uploads, completes and downloads the same bytes as an attachment under the original name', async () => {
    const bytes = Buffer.from('%PDF-1.7 hello from Kesari Threads');
    const up = await upload(a, bytes, 'Invoice #12 (मार्च).pdf');
    expect(up.putStatus).toBe(200);
    expect(new URL(up.uploadUrl).pathname).toContain(`/tenants/${a.workspaceId}/attachment/`);
    expect(up.uploadUrl).not.toContain('Invoice');
    const done = await call('POST', `/v1/files/${up.fileId}/complete`, a);
    expect(done.statusCode, done.body).toBe(200);
    expect(done.json()).toMatchObject({
      status: 'ready',
      sizeBytes: bytes.length,
      mime: 'application/pdf',
    });

    const dl = await call('GET', `/v1/files/${up.fileId}`, a);
    expect(dl.statusCode).toBe(200);
    const { url } = dl.json<{ url: string }>();
    expect(new URL(url).searchParams.get('X-Amz-Expires')).toBe('300');
    const fetched = await fetch(url);
    expect(Buffer.from(await fetched.arrayBuffer())).toEqual(bytes);
    expect(fetched.headers.get('content-disposition')).toMatch(
      /^attachment; filename="Invoice #12 \(_+\)\.pdf"; filename\*=UTF-8''/,
    );
  });

  it("AC: tenant B cannot obtain a signed URL for tenant A's file", async () => {
    const up = await upload(a, Buffer.from('private to A'), 'a-only.txt', 'text/plain');
    expect((await call('POST', `/v1/files/${up.fileId}/complete`, a)).statusCode).toBe(200);

    // B, in B's own workspace, with A's exact file id: not found, and no URL in the body.
    const asB = await call('GET', `/v1/files/${up.fileId}`, b);
    expect(asB.statusCode).toBe(404);
    expect(asB.body).not.toContain('X-Amz-Signature');
    expect((await call('POST', `/v1/files/${up.fileId}/complete`, b)).statusCode).toBe(404);
    // B naming A's workspace is refused before any lookup.
    expect(
      (await call('GET', `/v1/files/${up.fileId}`, b, undefined, a.workspaceId)).json().error.code,
    ).toBe('WORKSPACE_NOT_MEMBER');
    // A still can.
    expect((await call('GET', `/v1/files/${up.fileId}`, a)).statusCode).toBe(200);
  });

  it('refuses types and sizes outside the attachment limits, with field messages', async () => {
    const exe = await call('POST', '/v1/files/upload-url', a, {
      purpose: 'attachment',
      filename: 'run.exe',
      mime: 'application/x-msdownload',
      sizeBytes: 10,
    });
    expect(exe.statusCode).toBe(422);
    expect(JSON.stringify(exe.json())).toContain('cannot be sent');
    const huge = await call('POST', '/v1/files/upload-url', a, {
      purpose: 'attachment',
      filename: 'photo.jpg',
      mime: 'image/jpeg',
      sizeBytes: 6 * 1024 * 1024,
    });
    expect(huge.statusCode).toBe(422);
    expect(JSON.stringify(huge.json())).toContain('5 MB');
  });

  it('will not complete or serve a file that was not uploaded', async () => {
    const res = await call('POST', '/v1/files/upload-url', a, {
      purpose: 'attachment',
      filename: 'later.pdf',
      mime: 'application/pdf',
      sizeBytes: 20,
    });
    const { fileId } = res.json<{ fileId: string }>();
    expect((await call('POST', `/v1/files/${fileId}/complete`, a)).statusCode).toBe(409);
    expect((await call('GET', `/v1/files/${fileId}`, a)).statusCode).toBe(409);
  });

  it('a different size than announced never becomes a ready file', async () => {
    // Announce 10 bytes, send 30: S3 rejects the signed PUT, or completion catches it.
    const up = await upload(a, Buffer.alloc(30, 1), 'small.pdf', 'application/pdf', 10);
    const done = await call('POST', `/v1/files/${up.fileId}/complete`, a);
    expect(up.putStatus === 200 ? done.statusCode : 409).not.toBe(200);
    expect([409, 422]).toContain(done.statusCode);
    expect((await call('GET', `/v1/files/${up.fileId}`, a)).statusCode).toBe(409);
  });
});
