import { Banner } from '@astryxdesign/core/Banner';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
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

  if (status.state === 'error')
    return (
      <Banner
        status="error"
        role="alert"
        title="The API is not reachable right now."
        description="Messages may be delayed; try again in a minute."
      />
    );

  return (
    <p aria-live="polite" className="inline-flex items-center gap-2">
      {status.state === 'ok' ? (
        <>
          <StatusDot variant="success" label="Online" />
          <Text color="secondary">API is reachable.</Text>
        </>
      ) : (
        <>
          <StatusDot variant="neutral" label="Checking" isPulsing />
          <Text color="secondary">Checking the API…</Text>
        </>
      )}
    </p>
  );
}
