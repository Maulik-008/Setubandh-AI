import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { FullPageSpinner } from '../components/FullPageSpinner';
import { useSession } from './SessionProvider';

/** Only same-app paths are allowed as a post-login destination (no open redirect). */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
    ? next
    : '/';
}

/** App routes: signed-out visitors go to /login?next=<where they were going>. */
export function RequireAuth() {
  const { state } = useSession();
  const location = useLocation();
  if (state.status === 'loading') return <FullPageSpinner />;
  if (state.status === 'signedOut') {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <Outlet />;
}

/** Login, signup and friends: a signed-in user goes straight on. */
export function RedirectIfSignedIn() {
  const { state } = useSession();
  const [params] = useSearchParams();
  if (state.status === 'loading') return <FullPageSpinner />;
  if (state.status === 'signedIn') return <Navigate to={safeNext(params.get('next'))} replace />;
  return <Outlet />;
}
