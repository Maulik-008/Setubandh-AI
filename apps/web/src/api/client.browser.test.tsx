import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { worker } from '../test/msw';
import { apiError, sessionBody } from '../test/render';
import { api, ApiError, refreshSession, session } from './client';

describe('API client: silent refresh (requirements §13.2)', () => {
  afterEach(() => {
    session.setAccessToken(null);
    session.setWorkspace(null);
  });

  it('refreshes once for parallel 401s, then retries each call with the new token', async () => {
    session.setAccessToken('expired');
    session.setWorkspace('01900000-0000-7000-8000-00000000000a');
    let refreshes = 0;
    const seen: { auth: string | null; ws: string | null }[] = [];
    worker.use(
      http.post('/v1/auth/refresh', async () => {
        refreshes += 1;
        await new Promise((r) => setTimeout(r, 30));
        return HttpResponse.json(sessionBody({}, 'fresh'));
      }),
      http.get('/v1/members', ({ request }) => {
        const auth = request.headers.get('authorization');
        seen.push({ auth, ws: request.headers.get('x-workspace-id') });
        return auth === 'Bearer fresh'
          ? HttpResponse.json({ members: [] })
          : apiError(401, 'UNAUTHENTICATED', 'Please sign in.');
      }),
    );
    const results = await Promise.all([api('/v1/members'), api('/v1/members'), api('/v1/members')]);
    expect(results).toEqual([{ members: [] }, { members: [] }, { members: [] }]);
    expect(refreshes).toBe(1);
    expect(seen.filter((s) => s.auth === 'Bearer fresh')).toHaveLength(3);
    expect(new Set(seen.map((s) => s.ws))).toEqual(
      new Set(['01900000-0000-7000-8000-00000000000a']),
    );
  });

  it('signs out when the refresh fails', async () => {
    session.setAccessToken('expired');
    let signedOut = 0;
    const off = session.onSignedOut(() => (signedOut += 1));
    worker.use(
      http.post('/v1/auth/refresh', () =>
        apiError(401, 'SESSION_REVOKED', 'Your session has ended.'),
      ),
      http.get('/v1/workspace', () => apiError(401, 'UNAUTHENTICATED', 'Please sign in.')),
    );
    await expect(api('/v1/workspace')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      status: 401,
    });
    expect(signedOut).toBe(1);
    expect(session.hasAccessToken()).toBe(false);
    off();
  });

  it('turns the error shape into an ApiError with code, message and details', async () => {
    worker.use(
      http.post('/v1/x', () =>
        apiError(409, 'WORKSPACE_LIMIT_REACHED', 'You already own 3.', { max: 3 }),
      ),
    );
    const error = await api('/v1/x', { method: 'POST', body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'WORKSPACE_LIMIT_REACHED',
      message: 'You already own 3.',
      details: { max: 3 },
    });
  });

  it('reports a network failure in plain words', async () => {
    worker.use(http.get('/v1/down', () => HttpResponse.error()));
    await expect(api('/v1/down')).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('shares one refresh request between callers', async () => {
    let refreshes = 0;
    worker.use(
      http.post('/v1/auth/refresh', () => ((refreshes += 1), HttpResponse.json(sessionBody()))),
    );
    await Promise.all([refreshSession(), refreshSession()]);
    expect(refreshes).toBe(1);
  });
});
