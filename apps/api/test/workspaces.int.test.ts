import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminQuery } from '@setubandh/testing';
import { bootAuthApi, type AuthTestApp } from './support/auth-app';

// M1-11 acceptance tests (requirements §5.2, §6; plan §3) on real Postgres and Valkey.
const PASSWORD = 'correct horse battery staple';

interface Actor {
  email: string;
  token: string;
  userId: string;
}

describe('workspaces, members, invitations and roles', () => {
  let t: AuthTestApp;
  let owner: Actor;
  let admin: Actor;
  let agent: Actor;
  let workspaceId: string;

  const ip = () => `10.20.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  const call = (
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    url: string,
    actor?: Actor,
    payload?: object,
    ws: string | null = workspaceId,
  ) =>
    t.app.inject({
      method,
      url,
      payload,
      headers: {
        'x-forwarded-for': ip(),
        ...(actor ? { authorization: `Bearer ${actor.token}` } : {}),
        ...(ws ? { 'x-workspace-id': ws } : {}),
      },
    });

  async function signupAndLogin(workspaceName = 'Shop'): Promise<Actor> {
    const email = `${randomUUID()}@example.com`;
    await call(
      'POST',
      '/v1/auth/signup',
      undefined,
      { name: 'Owner', email, password: PASSWORD, workspaceName },
      null,
    );
    const res = await call(
      'POST',
      '/v1/auth/login',
      undefined,
      { email, password: PASSWORD },
      null,
    );
    const body = res.json<{ accessToken: string; user: { id: string } }>();
    return { email, token: body.accessToken, userId: body.user.id };
  }

  /** Invite a brand-new person and let them accept by creating their account from the link. */
  async function inviteNewUser(
    inviter: Actor,
    role: 'admin' | 'agent',
    ws = workspaceId,
  ): Promise<Actor> {
    const email = `${randomUUID()}@example.com`;
    const invite = await call('POST', '/v1/invitations', inviter, { email, role }, ws);
    expect(invite.statusCode).toBe(201);
    const accepted = await call(
      'POST',
      '/v1/auth/accept-invite',
      undefined,
      { token: t.outbox.tokenFor(email), name: role, password: PASSWORD },
      null,
    );
    expect(accepted.statusCode).toBe(200);
    const body = accepted.json<{
      accessToken: string;
      user: { id: string; emailVerified: boolean };
    }>();
    expect(body.user.emailVerified).toBe(true);
    return { email, token: body.accessToken, userId: body.user.id };
  }

  const memberIdOf = async (actor: Actor, ws = workspaceId, viewer = owner) => {
    const members = (await call('GET', '/v1/members', viewer, undefined, ws)).json<{
      members: { id: string; userId: string }[];
    }>().members;
    return members.find((m) => m.userId === actor.userId)!.id;
  };

  beforeAll(async () => {
    t = await bootAuthApi();
    owner = await signupAndLogin('Kesari Threads');
    const list = await call('GET', '/v1/workspaces', owner, undefined, null);
    workspaceId = list.json<{ workspaces: { id: string; role: string }[] }>().workspaces[0]!.id;
    admin = await inviteNewUser(owner, 'admin');
    agent = await inviteNewUser(owner, 'agent');
  }, 180_000);

  afterAll(async () => {
    await t?.close();
  });

  // --- AC 1: table-driven permissions (plan §3) ----------------------------------------------
  const NO_SUCH_ID = '01900000-0000-7000-8000-000000000000';
  const cases: {
    name: string;
    run: (a: Actor) => ReturnType<typeof call>;
    allowed: Record<'owner' | 'admin' | 'agent', boolean>;
  }[] = [
    {
      name: 'read workspace',
      run: (a) => call('GET', '/v1/workspace', a),
      allowed: { owner: true, admin: true, agent: true },
    },
    {
      name: 'update workspace settings',
      run: (a) => call('PATCH', '/v1/workspace', a, { name: 'Kesari Threads' }),
      allowed: { owner: true, admin: true, agent: false },
    },
    {
      name: 'list members',
      run: (a) => call('GET', '/v1/members', a),
      allowed: { owner: true, admin: true, agent: true },
    },
    {
      name: 'change a role',
      run: (a) => call('PATCH', `/v1/members/${NO_SUCH_ID}`, a, { role: 'agent' }),
      allowed: { owner: true, admin: true, agent: false },
    },
    {
      name: 'remove a member',
      run: (a) => call('DELETE', `/v1/members/${NO_SUCH_ID}`, a),
      allowed: { owner: true, admin: true, agent: false },
    },
    {
      name: 'list invitations',
      run: (a) => call('GET', '/v1/invitations', a),
      allowed: { owner: true, admin: true, agent: false },
    },
    {
      name: 'invite a member',
      run: (a) =>
        call('POST', '/v1/invitations', a, { email: `${randomUUID()}@example.com`, role: 'agent' }),
      allowed: { owner: true, admin: true, agent: false },
    },
    {
      name: 'revoke an invitation',
      run: (a) => call('DELETE', `/v1/invitations/${NO_SUCH_ID}`, a),
      allowed: { owner: true, admin: true, agent: false },
    },
    {
      name: 'transfer ownership',
      run: (a) => call('POST', '/v1/workspace/transfer-ownership', a, { memberId: NO_SUCH_ID }),
      allowed: { owner: true, admin: false, agent: false },
    },
  ];

  for (const c of cases) {
    for (const role of ['owner', 'admin', 'agent'] as const) {
      it(`AC: ${role} ${c.allowed[role] ? 'can' : 'cannot'} ${c.name}`, async () => {
        const actor = { owner, admin, agent }[role];
        const res = await c.run(actor);
        if (c.allowed[role]) {
          expect(res.statusCode, res.body).not.toBe(403);
        } else {
          expect(res.statusCode).toBe(403);
          expect(res.json().error.code).toBe('FORBIDDEN');
        }
      });
    }
  }

  // --- AC 2: removal takes effect on the very next request ------------------------------------
  it('AC: a removed member loses access immediately (WORKSPACE_NOT_MEMBER)', async () => {
    const temp = await inviteNewUser(owner, 'agent');
    expect((await call('GET', '/v1/members', temp)).statusCode).toBe(200);
    expect((await call('DELETE', `/v1/members/${await memberIdOf(temp)}`, owner)).statusCode).toBe(
      204,
    );
    const after = await call('GET', '/v1/members', temp); // same, still unexpired access token
    expect(after.statusCode).toBe(403);
    expect(after.json().error.code).toBe('WORKSPACE_NOT_MEMBER');
  });

  // --- AC 3: two workspaces, only the active one's data ---------------------------------------
  it('AC: a user in two workspaces only sees data of the active one', async () => {
    const otherOwner = await signupAndLogin('Second Shop');
    const otherWs = (await call('GET', '/v1/workspaces', otherOwner, undefined, null)).json<{
      workspaces: { id: string }[];
    }>().workspaces[0]!.id;
    const both = await inviteNewUser(otherOwner, 'agent', otherWs);
    // `both` is in Second Shop; invite them into Kesari Threads too (existing user accepts).
    await call('POST', '/v1/invitations', owner, { email: both.email, role: 'agent' });
    expect(
      (
        await call(
          'POST',
          '/v1/invitations/accept',
          both,
          { token: t.outbox.tokenFor(both.email) },
          null,
        )
      ).statusCode,
    ).toBe(200);

    const listA = (await call('GET', '/v1/members', both, undefined, workspaceId))
      .json<{ members: { email: string }[] }>()
      .members.map((m) => m.email);
    const listB = (await call('GET', '/v1/members', both, undefined, otherWs))
      .json<{ members: { email: string }[] }>()
      .members.map((m) => m.email);
    expect(listA).toContain(owner.email);
    expect(listA).not.toContain(otherOwner.email);
    expect(listB).toContain(otherOwner.email);
    expect(listB).not.toContain(owner.email);

    // A workspace the caller does not belong to is refused outright.
    expect(
      (await call('GET', '/v1/members', otherOwner, undefined, workspaceId)).json().error.code,
    ).toBe('WORKSPACE_NOT_MEMBER');
  });

  // --- Rules around the Owner ------------------------------------------------------------------
  it('an Admin can never change or remove the Owner, and nobody can remove the Owner', async () => {
    const ownerMember = await memberIdOf(owner);
    expect(
      (await call('PATCH', `/v1/members/${ownerMember}`, admin, { role: 'agent' })).statusCode,
    ).toBe(403);
    expect((await call('DELETE', `/v1/members/${ownerMember}`, admin)).statusCode).toBe(403);
    expect((await call('DELETE', `/v1/members/${ownerMember}`, owner)).json().error.code).toBe(
      'CONFLICT',
    );
    expect(
      (await call('PATCH', `/v1/members/${await memberIdOf(agent)}`, admin, { role: 'owner' }))
        .statusCode,
    ).toBe(422);
  });

  it('transfers ownership: the new Owner gets it, the old Owner becomes Admin', async () => {
    const solo = await signupAndLogin('Transfer Co');
    const ws = (await call('GET', '/v1/workspaces', solo, undefined, null)).json<{
      workspaces: { id: string }[];
    }>().workspaces[0]!.id;
    const heir = await inviteNewUser(solo, 'admin', ws);
    const heirMember = await memberIdOf(heir, ws, solo);
    expect(
      (await call('POST', '/v1/workspace/transfer-ownership', solo, { memberId: heirMember }, ws))
        .statusCode,
    ).toBe(200);
    const roles = (await call('GET', '/v1/members', heir, undefined, ws)).json<{
      members: { userId: string; role: string }[];
    }>().members;
    expect(roles.find((m) => m.userId === heir.userId)?.role).toBe('owner');
    expect(roles.find((m) => m.userId === solo.userId)?.role).toBe('admin');
  });

  // --- Workspace limits, settings and switching ------------------------------------------------
  it('caps owned workspaces at 3 per user', async () => {
    const u = await signupAndLogin('One');
    expect((await call('POST', '/v1/workspaces', u, { name: 'Two' }, null)).statusCode).toBe(201);
    expect((await call('POST', '/v1/workspaces', u, { name: 'Three' }, null)).statusCode).toBe(201);
    const fourth = await call('POST', '/v1/workspaces', u, { name: 'Four' }, null);
    expect(fourth.statusCode).toBe(409);
    expect(fourth.json().error.code).toBe('WORKSPACE_LIMIT_REACHED');
  });

  it('the "Agents can see all conversations" setting changes the agent\'s effective permissions', async () => {
    const perms = async () =>
      (await call('GET', '/v1/workspace', agent)).json<{ permissions: string[] }>().permissions;
    expect(await perms()).not.toContain('inbox.view_all');
    await call('PATCH', '/v1/workspace', owner, { agentsSeeAllConversations: true });
    expect(await perms()).toContain('inbox.view_all');
    await call('PATCH', '/v1/workspace', owner, { agentsSeeAllConversations: false });
  });

  it('remembers the last workspace for the switcher', async () => {
    expect(
      (await call('PUT', '/v1/me/last-workspace', owner, { workspaceId }, null)).statusCode,
    ).toBe(204);
    const list = (await call('GET', '/v1/workspaces', owner, undefined, null)).json<{
      lastWorkspaceId: string;
    }>();
    expect(list.lastWorkspaceId).toBe(workspaceId);
    const notMine = await call(
      'PUT',
      '/v1/me/last-workspace',
      admin,
      { workspaceId: NO_SUCH_ID },
      null,
    );
    expect(notMine.json().error.code).toBe('WORKSPACE_NOT_MEMBER');
  });

  it('requires X-Workspace-Id on workspace routes', async () => {
    const res = await call('GET', '/v1/members', owner, undefined, null);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('WORKSPACE_REQUIRED');
  });

  // --- Invitations ---------------------------------------------------------------------------
  it('refuses an invite accepted by a different signed-in user, an expired one and a revoked one', async () => {
    const email = `${randomUUID()}@example.com`;
    await call('POST', '/v1/invitations', owner, { email, role: 'agent' });
    const token = t.outbox.tokenFor(email);
    expect(
      (await call('POST', '/v1/invitations/accept', agent, { token }, null)).json().error.code,
    ).toBe('INVITATION_INVALID');

    const late = `${randomUUID()}@example.com`;
    await call('POST', '/v1/invitations', owner, { email: late, role: 'agent' });
    const lateToken = t.outbox.tokenFor(late);
    // Expire it in the database: moving the shared clock would also expire every access token.
    await adminQuery(
      t.db.adminUrl,
      `UPDATE invitations SET expires_at = now() - interval '1 minute' WHERE email = $1`,
      [late],
    );
    expect(
      (
        await call(
          'POST',
          '/v1/auth/accept-invite',
          undefined,
          { token: lateToken, name: 'L', password: PASSWORD },
          null,
        )
      ).json().error.code,
    ).toBe('INVITATION_INVALID');

    const revoked = `${randomUUID()}@example.com`;
    const created = (
      await call('POST', '/v1/invitations', owner, { email: revoked, role: 'agent' })
    ).json<{ id: string }>();
    expect((await call('DELETE', `/v1/invitations/${created.id}`, owner)).statusCode).toBe(204);
    expect(
      (
        await call(
          'POST',
          '/v1/auth/accept-invite',
          undefined,
          { token: t.outbox.tokenFor(revoked), name: 'R', password: PASSWORD },
          null,
        )
      ).json().error.code,
    ).toBe('INVITATION_INVALID');
  });

  it('resend issues a new link and the old one stops working', async () => {
    const email = `${randomUUID()}@example.com`;
    const created = (await call('POST', '/v1/invitations', owner, { email, role: 'agent' })).json<{
      id: string;
    }>();
    const first = t.outbox.tokenFor(email);
    expect((await call('POST', `/v1/invitations/${created.id}/resend`, owner)).statusCode).toBe(
      202,
    );
    const second = t.outbox.tokenFor(email);
    expect(second).not.toBe(first);
    expect(
      (
        await call(
          'POST',
          '/v1/auth/accept-invite',
          undefined,
          { token: first, name: 'A', password: PASSWORD },
          null,
        )
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await call(
          'POST',
          '/v1/auth/accept-invite',
          undefined,
          { token: second, name: 'A', password: PASSWORD },
          null,
        )
      ).statusCode,
    ).toBe(200);
  });

  // --- Audit log (M1-12) ----------------------------------------------------------------------
  it('records member and settings changes in the tenant audit log, with actor and target', async () => {
    const agentMember = await memberIdOf(agent);
    await call('PATCH', `/v1/members/${agentMember}`, owner, { role: 'admin' });
    await call('PATCH', `/v1/members/${agentMember}`, owner, { role: 'agent' });
    const rows = await adminQuery<{
      action: string;
      actor_id: string;
      target_type: string;
      metadata: Record<string, unknown>;
    }>(
      t.db.adminUrl,
      `SELECT action, actor_id, target_type, metadata FROM audit_logs WHERE tenant_id = $1::uuid ORDER BY created_at`,
      [workspaceId],
    );
    const actions = new Set(rows.map((r) => r.action));
    for (const action of [
      'member.invited',
      'invitation.accepted',
      'member.role_changed',
      'member.removed',
      'invitation.revoked',
      'workspace.settings_changed',
    ]) {
      expect(actions, action).toContain(action);
    }
    expect(rows.every((r) => r.actor_id && r.target_type)).toBe(true);
    const roleChange = rows.find((r) => r.action === 'member.role_changed');
    expect(roleChange?.metadata).toMatchObject({ from: 'agent', to: 'admin' });
    // Member events no longer go to the account-level security log.
    const moved = await adminQuery(
      t.db.adminUrl,
      `SELECT 1 FROM security_events WHERE type LIKE 'member%'`,
    );
    expect(moved).toEqual([]);
  });
});
