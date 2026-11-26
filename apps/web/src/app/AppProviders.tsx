import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppTheme } from '@setubandh/ui';
import { useState, type ReactNode } from 'react';
import { ApiError } from '../api/client';
import { SessionProvider } from '../auth/SessionProvider';
import '../i18n';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Client errors (4xx) will not fix themselves by retrying.
        retry: (count, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      },
    },
  });
}

/** Theme, server state and session: everything a screen needs, for the app and for tests. */
export function AppProviders({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient?: QueryClient;
}) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <AppTheme>
      <QueryClientProvider client={client}>
        <SessionProvider>{children}</SessionProvider>
      </QueryClientProvider>
    </AppTheme>
  );
}
