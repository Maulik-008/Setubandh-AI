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
  await waitFor(() => {
    found = screen
      .getAllByText(text)
      .find((el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
    if (!found) throw new Error(`No visible element with text ${String(text)}`);
  });
  return found!;
}

/** The form-level error (FormError), not the field messages or the announcer region. */
export async function findFormError(text: string | RegExp): Promise<HTMLElement> {
  const el = await findVisibleText(text);
  const alert = el.closest('[data-form-error]');
  if (!alert) throw new Error(`"${String(text)}" is not inside the form error`);
  return alert as HTMLElement;
}
