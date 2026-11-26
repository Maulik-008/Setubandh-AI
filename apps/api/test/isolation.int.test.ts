import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { describeRouteAccess, type RouteInfo } from '../src/core/access';
import { bootAuthApi, type AuthTestApp } from './support/auth-app';

// M1-12 tenant isolation suite (requirements §5.2, P1-04). It discovers every workspace route,
// so a new endpoint is covered the moment it exists, or the suite fails and says what it needs.

const PASSWORD = 'correct horse battery staple';

interface Actor {
  email: string;
  token: string;
  userId: string;
}

interface Tenant {
  owner: Actor;
  workspaceId: string;
  memberId: string; // a non-owner member
  invitationId: string; // an open invitation
  fileId: string; // a file (pending: B must not even learn it exists)
}

/**
 * Per route: path parameters and a valid body, both pointing at tenant A's data. Called in
 * tenant B, every one must answer 404 (B cannot reach A's resource even with its exact id).
 */
type Fixture = (a: Tenant) => { params?: Record<string, string>; body?: object };
const CROSS_TENANT_FIXTURES: Record<string, Fixture> = {
  'PATCH /v1/members/:id': (a) => ({ params: { id: a.memberId }, body: { role: 'admin' } }),
  'DELETE /v1/members/:id': (a) => ({ params: { id: a.memberId } }),
  'POST /v1/invitations/:id/resend': (a) => ({ params: { id: a.invitationId } }),
  'DELETE /v1/invitations/:id': (a) => ({ params: { id: a.invitationId } }),
  'POST /v1/workspace/transfer-ownership': (a) => ({ body: { memberId: a.memberId } }),
  'GET /v1/files/:id': (a) => ({ params: { id: a.fileId } }),
  'POST /v1/files/:id/complete': (a) => ({ params: { id: a.fileId } }),
};

const key = (r: RouteInfo) => `${r.method} ${r.path}`;
const fill = (path: string, params: Record<string, string> = {}) =>
  path.replace(/:(\w+)/g, (_, name: string) => params[name] ?? randomUUID());

describe('tenant isolation suite: every workspace endpoint (requirements §5.2)', () => {
  let t: AuthTestApp;
  let a: Tenant;
  let b: Tenant;
  let routes: RouteInfo[];

  const ip = () => `10.40.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  const call = (
    method: string,
    url: string,
    actor: Actor | null,
    ws: string | null,
    payload?: object,
  ) =>
    t.app.inject({
      method: method as 'GET',
      url,
      payload,
      headers: {
        'x-forwarded-for': ip(),
        ...(actor ? { authorization: `Bearer ${actor.token}` } : {}),
        ...(ws ? { 'x-workspace-id': ws } : {}),
      },
    });

  async function seedTenant(name: string): Promise<Tenant> {
    const email = `${randomUUID()}@example.com`;
    await call('POST', '/v1/auth/signup', null, null, {
      name,
      email,
      password: PASSWORD,
      workspaceName: name,
    });
    const login = (
      await call('POST', '/v1/auth/login', null, null, { email, password: PASSWORD })
    ).json<{
      accessToken: string;
      user: { id: string };
    }>();
    const owner = { email, token: login.accessToken, userId: login.user.id };
    const workspaceId = (await call('GET', '/v1/workspaces', owner, null)).json<{
      workspaces: { id: string }[];
    }>().workspaces[0]!.id;
    // A second member, created through an invitation.
    const memberEmail = `${randomUUID()}@example.com`;
    await call('POST', '/v1/invitations', owner, workspaceId, {
      email: memberEmail,
      role: 'agent',
    });
    await call('POST', '/v1/auth/accept-invite', null, null, {
      token: t.outbox.tokenFor(memberEmail),
      name: 'Member',
      password: PASSWORD,
    });
    const members = (await call('GET', '/v1/members', owner, workspaceId)).json<{
      members: { id: string; email: string }[];
    }>().members;
    const memberId = members.find((m) => m.email === memberEmail)!.id;
    // And one open invitation.
    const invitationId = (
      await call('POST', '/v1/invitations', owner, workspaceId, {
        email: `${randomUUID()}@example.com`,
        role: 'agent',
      })
    ).json<{ id: string }>().id;
    const fileId = (
      await call('POST', '/v1/files/upload-url', owner, workspaceId, {
        purpose: 'attachment',
        filename: 'secret.pdf',
        mime: 'application/pdf',
        sizeBytes: 10,
      })
    ).json<{ fileId: string }>().fileId;
    return { owner, workspaceId, memberId, invitationId, fileId };
  }

  beforeAll(async () => {
    t = await bootAuthApi();
    a = await seedTenant('Tenant A');
    b = await seedTenant('Tenant B');
    routes = describeRouteAccess(t.app).filter((r) => r.access === 'workspace');
  }, 180_000);

  afterAll(async () => {
    await t?.close();
  });

  it('finds the workspace routes to check', () => {
    expect(routes.length).toBeGreaterThanOrEqual(10);
  });

  it("refuses every workspace route when B names A's workspace (WORKSPACE_NOT_MEMBER)", async () => {
    for (const route of routes) {
      const res = await call(route.method, fill(route.path), b.owner, a.workspaceId, {});
      expect(res.statusCode, key(route)).toBe(403);
      expect(res.json().error.code, key(route)).toBe('WORKSPACE_NOT_MEMBER');
    }
  });

  it("cannot reach A's resources by id from inside B's workspace", async () => {
    const targeted = routes.filter((r) => r.path.includes(':') || CROSS_TENANT_FIXTURES[key(r)]);
    for (const route of targeted) {
      const fixture = CROSS_TENANT_FIXTURES[key(route)];
      expect(fixture, `add a fixture for "${key(route)}" to CROSS_TENANT_FIXTURES`).toBeDefined();
      const { params, body } = fixture!(a);
      const res = await call(route.method, fill(route.path, params), b.owner, b.workspaceId, body);
      expect(res.statusCode, `${key(route)}: ${res.body}`).toBe(404);
    }
    // A's data is untouched.
    const members = (await call('GET', '/v1/members', a.owner, a.workspaceId)).json<{
      members: { id: string; role: string }[];
    }>().members;
    expect(members.find((m) => m.id === a.memberId)?.role).toBe('agent');
    const invites = (await call('GET', '/v1/invitations', a.owner, a.workspaceId)).json<{
      invitations: { id: string }[];
    }>().invitations;
    expect(invites.map((i) => i.id)).toContain(a.invitationId);
  });

  it("never returns A's identifiers from any readable endpoint called in B", async () => {
    const secrets = [
      a.workspaceId,
      a.memberId,
      a.invitationId,
      a.fileId,
      a.owner.userId,
      a.owner.email,
    ];
    const readable = routes.filter((r) => r.method === 'GET' && !r.path.includes(':'));
    expect(readable.length).toBeGreaterThan(0);
    for (const route of readable) {
      const res = await call('GET', route.path, b.owner, b.workspaceId);
      expect(res.statusCode, key(route)).toBe(200);
      for (const secret of secrets)
        expect(res.body, `${key(route)} leaks ${secret}`).not.toContain(secret);
    }
  });
});
