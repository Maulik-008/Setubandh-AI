import type { SessionResponse } from '@setubandh/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/auth';
import { refreshSession, session } from '../api/client';

export type SessionUser = SessionResponse['user'];

type SessionState =
  | { status: 'loading'; user: null }
  | { status: 'signedOut'; user: null }
  | { status: 'signedIn'; user: SessionUser };

interface SessionContextValue {
  state: SessionState;
  /** Store a session returned by login, 2FA, refresh or accept-invite. */
  signIn: (session: SessionResponse) => void;
  signOut: () => Promise<void>;
  /** Update the signed-in user (after verifying the email or editing the profile). */
  updateUser: (changes: Partial<SessionUser>) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Holds who is signed in. On load it tries a silent refresh through the httpOnly cookie, so a
 * reload keeps the user signed in without ever storing a token in the browser.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>({ status: 'loading', user: null });

  const signIn = useCallback((s: SessionResponse) => {
    session.setAccessToken(s.accessToken);
    setState({ status: 'signedIn', user: s.user });
  }, []);

  const clear = useCallback(() => {
    session.setAccessToken(null);
    session.setWorkspace(null);
    queryClient.clear();
    setState({ status: 'signedOut', user: null });
  }, [queryClient]);

  const signOut = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    clear();
  }, [clear]);

  const updateUser = useCallback((changes: Partial<SessionUser>) => {
    setState((s) => (s.status === 'signedIn' ? { ...s, user: { ...s.user, ...changes } } : s));
  }, []);

  useEffect(() => {
    let active = true;
    void refreshSession().then((s) => {
      if (!active) return;
      if (s) signIn(s);
      else setState({ status: 'signedOut', user: null });
    });
    const off = session.onSignedOut(clear);
    return () => {
      active = false;
      off();
    };
  }, [signIn, clear]);

  const value = useMemo(
    () => ({ state, signIn, signOut, updateUser }),
    [state, signIn, signOut, updateUser],
  );
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
