import { useEffect, useState } from 'react';

type Status = { state: 'loading' } | { state: 'ok' } | { state: 'error' };

export const API_HEALTH_URL = `${import.meta.env.VITE_API_URL ?? '/api'}/health/ready`;

/** Shows whether the API is reachable. Real health endpoints arrive in M1-03. */
export function ApiStatus() {
  const [status, setStatus] = useState<Status>({ state: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetch(API_HEALTH_URL, { signal: controller.signal })
      .then((response) => setStatus({ state: response.ok ? 'ok' : 'error' }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setStatus({ state: 'error' });
        return error;
      });
    return () => controller.abort();
  }, []);

  if (status.state === 'loading') return <p aria-live="polite">Checking the API…</p>;
  if (status.state === 'ok')
    return (
      <p className="status-ok" aria-live="polite">
        API is reachable.
      </p>
    );
  return (
    <p className="status-error" role="alert">
      The API is not reachable right now. Messages may be delayed; try again in a minute.
    </p>
  );
}
