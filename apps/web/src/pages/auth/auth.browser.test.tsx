import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { worker } from '../../test/msw';
import {
  apiError,
  findFormError,
  findVisibleText,
  mockSession,
  renderApp,
  sessionBody,
} from '../../test/render';

const fill = async (label: RegExp, value: string) => {
  await userEvent.fill(await screen.findByLabelText(label), value);
};

describe('auth screens (real Chromium, MSW-mocked API)', () => {
  it('sends a signed-out visitor to /login with next, then back after signing in', async () => {
    mockSession(false);
    let body: unknown;
    worker.use(
      http.post('/v1/auth/login', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(sessionBody());
      }),
    );
    const { router } = renderApp('/inbox');
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=%2Finbox');

    await fill(/^Email/, 'asha@example.com');
    await fill(/^Password/, 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('heading', { level: 1, name: 'Inbox' });
    expect(router.state.location.pathname).toBe('/inbox');
    expect(body).toEqual({ email: 'asha@example.com', password: 'correct horse battery' });
  });

  it('validates on submit and shows the field message', async () => {
    mockSession(false);
    renderApp('/login');
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await findVisibleText(/invalid email/i)).toBeVisible();
  });

  it('shows the generic error for wrong credentials', async () => {
    mockSession(false);
    worker.use(
      http.post('/v1/auth/login', () =>
        apiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.'),
      ),
    );
    renderApp('/login');
    await fill(/^Email/, 'asha@example.com');
    await fill(/^Password/, 'wrong password here');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await findFormError('Email or password is incorrect.')).toBeVisible();
  });

  it('tells a locked-out user how long to wait', async () => {
    mockSession(false);
    worker.use(
      http.post('/v1/auth/login', () =>
        apiError(429, 'TOO_MANY_ATTEMPTS', 'Too many attempts.', { retryAfterSeconds: 540 }),
      ),
    );
    renderApp('/login');
    await fill(/^Email/, 'asha@example.com');
    await fill(/^Password/, 'whatever password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await findFormError(/Wait 9 minutes/)).toBeVisible();
  });

  it('asks for the 2FA code, then signs in; a recovery code is offered', async () => {
    mockSession(false);
    let secondStep: unknown;
    worker.use(
      http.post('/v1/auth/login', () =>
        HttpResponse.json({ mfaRequired: true, challengeToken: 'c'.repeat(43) }),
      ),
      http.post('/v1/auth/login/2fa', async ({ request }) => {
        secondStep = await request.json();
        return HttpResponse.json(sessionBody());
      }),
    );
    const { router } = renderApp('/login');
    await fill(/^Email/, 'asha@example.com');
    await fill(/^Password/, 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('heading', { level: 1, name: 'Two-step sign-in' });
    expect(screen.getByRole('button', { name: 'Use a recovery code instead' })).toBeVisible();
    await fill(/6-digit code/, '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(router.state.location.pathname).toBe('/');
    expect(secondStep).toEqual({ challengeToken: 'c'.repeat(43), code: '123456' });
  });

  it('sends a failed 2FA attempt back to sign in (the challenge is single use)', async () => {
    mockSession(false);
    worker.use(
      http.post('/v1/auth/login', () =>
        HttpResponse.json({ mfaRequired: true, challengeToken: 'c'.repeat(43) }),
      ),
      http.post('/v1/auth/login/2fa', () => apiError(401, 'INVALID_CREDENTIALS', 'Wrong code.')),
    );
    renderApp('/login');
    await fill(/^Email/, 'asha@example.com');
    await fill(/^Password/, 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await fill(/6-digit code/, '000000');
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and sign in' }));
    expect(
      await screen.findByText('That code did not work. Sign in again to get a new one.'),
    ).toBeVisible();
  });

  it('signs up with the browser time zone and says to check the inbox', async () => {
    mockSession(false);
    let body: Record<string, unknown> = {};
    worker.use(
      http.post('/v1/auth/signup', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ status: 'accepted' }, { status: 202 });
      }),
    );
    renderApp('/signup');
    await fill(/^Your name/, 'Asha');
    await fill(/^Work email/, 'asha@example.com');
    await fill(/^Password/, 'a long enough password');
    await fill(/^Business name/, 'Kesari Threads');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeVisible();
    expect(body).toMatchObject({ email: 'asha@example.com', workspaceName: 'Kesari Threads' });
    expect(body.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it('puts a breached-password rejection on the password field', async () => {
    mockSession(false);
    worker.use(
      http.post('/v1/auth/signup', () =>
        apiError(422, 'PASSWORD_REJECTED', 'Choose a different password.', {
          fields: { password: 'This password has appeared in a data breach.' },
        }),
      ),
    );
    renderApp('/signup');
    await fill(/^Your name/, 'Asha');
    await fill(/^Work email/, 'asha@example.com');
    await fill(/^Password/, 'password1234');
    await fill(/^Business name/, 'Kesari Threads');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await findVisibleText('This password has appeared in a data breach.')).toBeVisible();
  });

  it('confirms an email link exactly once, even under StrictMode', async () => {
    mockSession(false);
    let calls = 0;
    worker.use(
      http.post('/v1/auth/verify-email', () => {
        calls += 1;
        return HttpResponse.json({ status: 'verified' });
      }),
    );
    renderApp('/verify?token=' + 'v'.repeat(43));
    expect(await screen.findByRole('heading', { name: 'Email confirmed' })).toBeVisible();
    expect(calls).toBe(1);
  });

  it('offers a new link when the verify link is used or expired', async () => {
    mockSession(false);
    worker.use(
      http.post('/v1/auth/verify-email', () =>
        apiError(400, 'TOKEN_INVALID', 'This link is invalid or has expired. Request a new one.'),
      ),
    );
    renderApp('/verify?token=' + 'x'.repeat(43));
    expect(
      await screen.findByText('This link is invalid or has expired. Request a new one.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Send a new link' })).toBeVisible();
  });

  it('creates an account from an invitation and lands signed in', async () => {
    mockSession(false);
    worker.use(
      http.post('/v1/auth/accept-invite', () =>
        HttpResponse.json(sessionBody({ email: 'new@example.com' })),
      ),
    );
    const { router } = renderApp('/invite?token=' + 'i'.repeat(43));
    await fill(/^Your name/, 'Ravi');
    await fill(/^Choose a password/, 'a long enough password');
    await userEvent.click(screen.getByRole('button', { name: 'Create account and join' }));
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(router.state.location.pathname).toBe('/');
  });

  it('lets a signed-in user join, and explains a wrong-email invitation', async () => {
    mockSession(true);
    worker.use(
      http.post('/v1/invitations/accept', () =>
        apiError(400, 'INVITATION_INVALID', 'This invitation is invalid, used or expired.'),
      ),
    );
    renderApp('/invite?token=' + 'i'.repeat(43));
    await userEvent.click(await screen.findByRole('button', { name: 'Join workspace' }));
    expect(await findFormError(/This invitation is invalid/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign in as the invited email' })).toBeVisible();
  });

  it('shows the 404 page for an unknown address', async () => {
    mockSession(false);
    renderApp('/no/such/page');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  });

  it('redirects a signed-in user away from /login', async () => {
    mockSession(true);
    const { router } = renderApp('/login');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});
