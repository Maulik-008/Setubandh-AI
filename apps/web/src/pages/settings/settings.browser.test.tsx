import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { worker } from '../../test/msw';
import {
  findVisibleByRole,
  findVisibleText,
  mockSession,
  mockWorkspaces,
  renderApp,
  USER,
} from '../../test/render';

const RAVI = {
  id: '01900000-0000-7000-8000-0000000000c2',
  userId: '01900000-0000-7000-8000-000000000002',
  name: 'Ravi Kumar',
  email: 'ravi@example.com',
  role: 'agent',
  joinedAt: '2026-11-10T09:00:00.000Z',
};
const OWNER = {
  id: '01900000-0000-7000-8000-0000000000c1',
  userId: USER.id,
  name: USER.name,
  email: USER.email,
  role: 'owner',
  joinedAt: '2026-11-02T09:00:00.000Z',
};

interface Calls {
  invites: unknown[];
  rolePatches: { id: string; body: unknown }[];
  deletes: string[];
  workspacePatches: unknown[];
}

function mockMembersApi(): Calls {
  const calls: Calls = { invites: [], rolePatches: [], deletes: [], workspacePatches: [] };
  worker.use(
    http.get('/v1/members', () => HttpResponse.json({ members: [OWNER, RAVI] })),
    http.get('/v1/invitations', () =>
      HttpResponse.json({
        invitations: [
          {
            id: '01900000-0000-7000-8000-0000000000d1',
            email: 'arjun@example.com',
            role: 'agent',
            expiresAt: '2026-12-01T09:00:00.000Z',
            createdAt: '2026-11-24T09:00:00.000Z',
          },
        ],
      }),
    ),
    http.post('/v1/invitations', async ({ request }) => {
      const body = (await request.json()) as { email: string; role: string };
      calls.invites.push(body);
      return HttpResponse.json(
        {
          id: '01900000-0000-7000-8000-0000000000d2',
          ...body,
          expiresAt: '2026-12-03T09:00:00.000Z',
          createdAt: '2026-11-26T09:00:00.000Z',
        },
        { status: 201 },
      );
    }),
    http.patch('/v1/members/:id', async ({ params, request }) => {
      calls.rolePatches.push({ id: String(params.id), body: await request.json() });
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete('/v1/members/:id', ({ params }) => {
      calls.deletes.push(String(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
    http.patch('/v1/workspace', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      calls.workspacePatches.push(body);
      return HttpResponse.json({
        id: '01900000-0000-7000-8000-0000000000a1',
        name: body.name,
        timezone: body.timezone,
        country: 'IN',
        currency: 'INR',
        agentsSeeAllConversations: body.agentsSeeAllConversations,
        role: 'owner',
        permissions: ['workspace.settings', 'members.manage'],
        availability: 'offline',
      });
    }),
  );
  return calls;
}

describe('settings (real Chromium, MSW-mocked API)', () => {
  beforeEach(async () => {
    await page.viewport(1280, 900);
    mockSession(true);
  });

  it('/settings opens the Workspace tab, and each tab has its own URL', async () => {
    mockWorkspaces();
    mockMembersApi();
    const { router } = renderApp('/settings');
    await screen.findByRole('heading', { level: 2, name: 'Workspace profile' });
    expect(router.state.location.pathname).toBe('/settings/workspace');
    await userEvent.click(await findVisibleByRole('link', 'Members'));
    await screen.findByRole('heading', { level: 2, name: 'Members' });
    expect(router.state.location.pathname).toBe('/settings/members');
  });

  it('an Agent sees the team but no member actions, and read-only workspace settings (<Can>)', async () => {
    mockWorkspaces({ roleInA: 'agent' });
    mockMembersApi();
    renderApp('/settings/members');
    expect(await findVisibleText('Ravi Kumar')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Invite member' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Pending invitations' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Transfer ownership' })).toBeNull();
  });

  it('an Agent cannot save workspace settings', async () => {
    mockWorkspaces({ roleInA: 'agent' });
    mockMembersApi();
    renderApp('/settings/workspace');
    expect(
      await findVisibleText('Only Owners and Admins can change these settings.'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });

  it('the Owner invites a teammate by email and role', async () => {
    mockWorkspaces();
    const calls = mockMembersApi();
    renderApp('/settings/members');
    await userEvent.click(await findVisibleByRole('button', 'Invite member'));
    await userEvent.fill(await screen.findByLabelText(/^Email/), 'meera@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
    await waitFor(() =>
      expect(calls.invites).toEqual([{ email: 'meera@example.com', role: 'agent' }]),
    );
    expect(await findVisibleText('Invitation sent to meera@example.com.')).toBeVisible();
  });

  it('the Owner changes a role and removes a member after confirming', async () => {
    mockWorkspaces();
    const calls = mockMembersApi();
    renderApp('/settings/members');
    // The Owner's own row has no controls.
    await findVisibleText('Ravi Kumar');
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(1);

    await userEvent.click(await findVisibleByRole('combobox', 'Role for Ravi Kumar'));
    await userEvent.click(await findVisibleByRole('option', 'Admin'));
    await waitFor(() =>
      expect(calls.rolePatches).toEqual([{ id: RAVI.id, body: { role: 'admin' } }]),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    const dialog = await findVisibleByRole('alertdialog', /Remove Ravi Kumar/);
    expect(dialog).toHaveTextContent('They lose access');
    await userEvent.click(await findVisibleByRole('button', 'Remove member'));
    await waitFor(() => expect(calls.deletes).toEqual([RAVI.id]));
  });

  it('saves the workspace name, keeping the time zone', async () => {
    mockWorkspaces();
    const calls = mockMembersApi();
    renderApp('/settings/workspace');
    const name = await screen.findByLabelText(/^Business name/);
    expect(await findVisibleText('Asia/Kolkata')).toBeVisible();
    await userEvent.fill(name, 'Kesari Threads Studio');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(calls.workspacePatches).toEqual([
        {
          name: 'Kesari Threads Studio',
          timezone: 'Asia/Kolkata',
          agentsSeeAllConversations: false,
        },
      ]),
    );
    expect(await findVisibleText('Changes saved.')).toBeVisible();
  });

  it('sets up two-step sign-in and shows the 10 recovery codes once', async () => {
    mockWorkspaces();
    let enabled = false;
    let enableBody: unknown;
    const codes = Array.from({ length: 10 }, (_, i) => `abcde-${String(i).padStart(5, '0')}`);
    worker.use(
      http.get('/v1/me', () =>
        HttpResponse.json({ ...USER, locale: 'en', avatarUrl: null, twoFactorEnabled: enabled }),
      ),
      http.post('/v1/me/2fa/setup', () =>
        HttpResponse.json({
          secret: 'JBSWY3DPEHPK3PXP',
          otpauthUrl: 'otpauth://totp/x',
          qrSvg:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>',
        }),
      ),
      http.post('/v1/me/2fa/enable', async ({ request }) => {
        enableBody = await request.json();
        enabled = true;
        return HttpResponse.json({ recoveryCodes: codes });
      }),
    );
    renderApp('/settings/profile');
    await userEvent.click(await findVisibleByRole('button', 'Set up two-step sign-in'));
    expect(await findVisibleByRole('img', 'QR code for your authenticator app')).toBeVisible();
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeVisible();
    await userEvent.fill(screen.getByLabelText(/6-digit code/), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Turn on' }));
    const list = await findVisibleByRole('list', 'Recovery codes');
    expect(list.querySelectorAll('li')).toHaveLength(10);
    expect(enableBody).toEqual({ code: '123456' });
    await userEvent.click(screen.getByRole('button', { name: 'I saved them' }));
    expect(await findVisibleText('On')).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Recovery codes' })).toBeNull();
  });
});
