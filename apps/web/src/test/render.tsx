import { render } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AppProviders, createQueryClient } from '../app/AppProviders';
import { routes } from '../app/router';
import { session } from '../api/client';
import { worker } from './msw';

export const USER = {
  id: '01900000-0000-7000-8000-000000000001',
  email: 'asha@example.com',
  name: 'Asha',
  emailVerified: true,
};

export const sessionBody = (overrides: Partial<typeof USER> = {}, accessToken = 'access-1') => ({
  accessToken,
  expiresIn: 900,
  user: { ...USER, ...overrides },
});

/** The API's error shape (requirements §12.1). */
export const apiError = (
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) => HttpResponse.json({ error: { code, message, details, requestId: 'req-test' } }, { status });

/** Start signed out (the refresh cookie is missing) or signed in (refresh succeeds). */
export function mockSession(signedIn: boolean | ReturnType<typeof sessionBody>) {
  worker.use(
    http.post('/v1/auth/refresh', () =>
      signedIn
        ? HttpResponse.json(signedIn === true ? sessionBody() : signedIn)
        : apiError(401, 'SESSION_REVOKED', 'Your session has ended.'),
    ),
  );
}

/** Render the real app routes at `path`, with fresh providers. */
export function renderApp(path: string) {
  session.setAccessToken(null);
  session.setWorkspace(null);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...view, router };
}

/**
 * Wait for `text` to be visible on the page. Astryx keeps an off-screen announcer region with
 * copies of status messages, so "the first match" can be a hidden copy.
 */
export async function findVisibleText(text: string | RegExp): Promise<HTMLElement> {
  const { screen, waitFor } = await import('@testing-library/react');
  let found: HTMLElement | undefined;
  await waitFor(
    () => {
      found = screen
        .getAllByText(text)
        .find((el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
      if (!found) throw new Error(`No visible element with text ${String(text)}`);
    },
    { timeout: 5000 },
  );
  return found!;
}

/** The form-level error (FormError), not the field messages or the announcer region. */
export async function findFormError(text: string | RegExp): Promise<HTMLElement> {
  const el = await findVisibleText(text);
  const alert = el.closest('[data-form-error]');
  if (!alert) throw new Error(`"${String(text)}" is not inside the form error`);
  return alert as HTMLElement;
}

export const WS_A = '01900000-0000-7000-8000-0000000000a1';
export const WS_B = '01900000-0000-7000-8000-0000000000b2';

export const OWNER_PERMISSIONS = [
  'inbox.view_all',
  'inbox.view_unassigned',
  'inbox.reply',
  'inbox.resolve',
  'inbox.assign_self',
  'inbox.assign_any',
  'contacts.edit',
  'saved_replies.manage_own',
  'saved_replies.manage_shared',
  'channels.manage',
  'members.manage',
  'workspace.settings',
  'workspace.transfer_ownership',
] as const;
export const AGENT_PERMISSIONS = [
  'inbox.view_unassigned',
  'inbox.reply',
  'inbox.resolve',
  'inbox.assign_self',
  'contacts.edit',
  'saved_replies.manage_own',
] as const;

export interface WorkspaceMockLog {
  /** X-Workspace-Id of every GET /v1/workspace. */
  workspaceHeaders: (string | null)[];
  lastWorkspacePuts: unknown[];
}

/** Two workspaces: Owner of "Kesari Threads" (A, last used), Agent of "Second Shop" (B). */
export function mockWorkspaces(
  options: { roleInA?: 'owner' | 'admin' | 'agent' } = {},
): WorkspaceMockLog {
  const log: WorkspaceMockLog = { workspaceHeaders: [], lastWorkspacePuts: [] };
  const roleA = options.roleInA ?? 'owner';
  worker.use(
    http.get('/v1/workspaces', () =>
      HttpResponse.json({
        workspaces: [
          { id: WS_A, name: 'Kesari Threads', role: roleA },
          { id: WS_B, name: 'Second Shop', role: 'agent' },
        ],
        lastWorkspaceId: WS_A,
      }),
    ),
    http.put('/v1/me/last-workspace', async ({ request }) => {
      log.lastWorkspacePuts.push(await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
    http.get('/v1/workspace', ({ request }) => {
      const ws = request.headers.get('x-workspace-id');
      log.workspaceHeaders.push(ws);
      const isA = ws === WS_A;
      const role = isA ? roleA : 'agent';
      return HttpResponse.json({
        id: ws,
        name: isA ? 'Kesari Threads' : 'Second Shop',
        timezone: 'Asia/Kolkata',
        country: 'IN',
        currency: 'INR',
        agentsSeeAllConversations: false,
        role,
        permissions: role === 'agent' ? AGENT_PERMISSIONS : OWNER_PERMISSIONS,
        availability: 'offline',
      });
    }),
  );
  return log;
}

/**
 * The visible element with this role and name. AppShell keeps a hidden copy of the side nav for
 * the mobile drawer, and Astryx announcers copy messages, so "the first match" can be hidden.
 */
export async function findVisibleByRole(role: string, name: string | RegExp): Promise<HTMLElement> {
  const { screen, waitFor } = await import('@testing-library/react');
  let found: HTMLElement | undefined;
  await waitFor(
    () => {
      found = screen
        .getAllByRole(role, { name })
        .find((el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
      if (!found) throw new Error(`No visible ${role} named ${String(name)}`);
    },
    { timeout: 5000 },
  );
  return found!;
}
