import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { worker } from '../test/msw';
import { API_HEALTH_URL, ApiStatus } from './ApiStatus';

describe('<ApiStatus> (real Chromium, MSW-mocked API)', () => {
  it('says the API is reachable when the health check succeeds', async () => {
    worker.use(http.get(API_HEALTH_URL, () => HttpResponse.json({ status: 'ok' })));
    render(<ApiStatus />);
    expect(await screen.findByText('API is reachable.')).toBeVisible();
  });

  it('shows an alert with next steps when the health check fails', async () => {
    worker.use(http.get(API_HEALTH_URL, () => HttpResponse.json({}, { status: 503 })));
    render(<ApiStatus />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The API is not reachable right now');
    expect(alert).toHaveTextContent('try again in a minute');
  });
});
