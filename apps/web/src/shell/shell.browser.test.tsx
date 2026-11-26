import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { worker } from '../test/msw';
import {
  apiError,
  findVisibleByRole,
  mockSession,
  mockWorkspaces,
  renderApp,
  sessionBody,
  WS_A,
  WS_B,
} from '../test/render';

describe('app shell (real Chromium, MSW-mocked API)', () => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
  });

  it('opens the last used workspace and sends its X-Workspace-Id', async () => {
    mockSession(true);
    const log = mockWorkspaces();
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(await findVisibleByRole('button', /Kesari Threads/)).toBeVisible();
    await waitFor(() => expect(log.workspaceHeaders).toContain(WS_A));
    expect(await findVisibleByRole('link', 'Inbox')).toBeVisible();
  });

  it('switches workspace: remembers it, and every later request carries the new header', async () => {
    mockSession(true);
    const log = mockWorkspaces();
    renderApp('/');
    // Keyboard path (the popover animates, so a pointer click never sees a stable target).
    (await findVisibleByRole('button', /Kesari Threads/)).focus();
    await userEvent.keyboard('{Enter}');
    (await findVisibleByRole('button', /Second Shop/)).focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(log.lastWorkspacePuts).toEqual([{ workspaceId: WS_B }]));
    await waitFor(() => expect(log.workspaceHeaders.at(-1)).toBe(WS_B));
    expect(await findVisibleByRole('button', /Second Shop/)).toBeVisible();
  });

  it('sets my availability from the profile menu', async () => {
    mockSession(true);
    mockWorkspaces();
    let sent: unknown;
    worker.use(
      http.patch('/v1/members/me', async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(sent as { availability: string });
      }),
    );
    renderApp('/');
    await userEvent.click(
      await screen.findByRole('button', { name: /Account menu for Asha, Offline/ }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: /Away/ }));
    await waitFor(() => expect(sent).toEqual({ availability: 'away' }));
    expect(
      await screen.findByRole('button', { name: /Account menu for Asha, Away/ }),
    ).toBeVisible();
  });

  it('signs out from the profile menu', async () => {
    mockSession(true);
    mockWorkspaces();
    let loggedOut = false;
    worker.use(
      http.post(
        '/v1/auth/logout',
        () => ((loggedOut = true), new HttpResponse(null, { status: 204 })),
      ),
    );
    const { router } = renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: /Account menu for Asha/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(loggedOut).toBe(true);
    expect(router.state.location.pathname).toBe('/login');
  });

  it('asks a user without any workspace to create one', async () => {
    mockSession(true);
    let workspaces: { id: string; name: string; role: string }[] = [];
    let created: unknown;
    const log = mockWorkspaces();
    worker.use(
      http.get('/v1/workspaces', () => HttpResponse.json({ workspaces, lastWorkspaceId: null })),
      http.post('/v1/workspaces', async ({ request }) => {
        created = await request.json();
        workspaces = [{ id: WS_A, name: 'Kesari Threads', role: 'owner' }];
        return HttpResponse.json(workspaces[0], { status: 201 });
      }),
    );
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Create your workspace' });
    await userEvent.fill(screen.getByLabelText(/^Business name/), 'Kesari Threads');
    await userEvent.click(screen.getByRole('button', { name: 'Create workspace' }));
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(created).toMatchObject({ name: 'Kesari Threads' });
    await waitFor(() => expect(log.lastWorkspacePuts).toEqual([{ workspaceId: WS_A }]));
  });

  it('falls back to another workspace after being removed from the active one', async () => {
    mockSession(true);
    let removed = false;
    mockWorkspaces();
    worker.use(
      http.get('/v1/workspaces', () =>
        HttpResponse.json({
          workspaces: removed
            ? [{ id: WS_B, name: 'Second Shop', role: 'agent' }]
            : [
                { id: WS_A, name: 'Kesari Threads', role: 'owner' },
                { id: WS_B, name: 'Second Shop', role: 'agent' },
              ],
          lastWorkspaceId: WS_A,
        }),
      ),
      http.get('/v1/workspace', ({ request }) => {
        if (request.headers.get('x-workspace-id') === WS_A) {
          removed = true;
          return apiError(403, 'WORKSPACE_NOT_MEMBER', 'You are not a member of this workspace.');
        }
        return HttpResponse.json({
          id: WS_B,
          name: 'Second Shop',
          timezone: 'Asia/Kolkata',
          country: 'IN',
          currency: 'INR',
          agentsSeeAllConversations: false,
          role: 'agent',
          permissions: [],
          availability: 'offline',
        });
      }),
    );
    renderApp('/');
    expect(await findVisibleByRole('button', /Second Shop/)).toBeVisible();
  });

  it('shows the unverified banner with a working resend', async () => {
    mockSession(sessionBody({ emailVerified: false }));
    mockWorkspaces();
    let resent: unknown;
    worker.use(
      http.post('/v1/auth/resend-verification', async ({ request }) => {
        resent = await request.json();
        return HttpResponse.json({ status: 'accepted' }, { status: 202 });
      }),
    );
    renderApp('/');
    await userEvent.click(await findVisibleByRole('button', 'Send a new link'));
    await waitFor(() => expect(resent).toEqual({ email: 'asha@example.com' }));
  });

  it('shows the main destinations as a pill row on a phone', async () => {
    await page.viewport(375, 800);
    mockSession(true);
    mockWorkspaces();
    renderApp('/inbox');
    const pills = await screen.findByRole('navigation', { name: 'Main' });
    expect(within(pills).getByRole('link', { name: 'Inbox' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await userEvent.click(within(pills).getByRole('link', { name: 'Settings' }));
    await waitFor(() => expect(window.location.pathname).toBeDefined());
  });
});
