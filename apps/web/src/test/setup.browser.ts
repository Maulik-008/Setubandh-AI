// The real global stylesheet, loaded first as in main.tsx.
import '@setubandh/ui/globals.css';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { worker } from './msw';

beforeAll(async () => {
  await worker.start({ quiet: true, onUnhandledFrame: 'error' });
});

afterEach(() => {
  worker.resetHandlers();
  cleanup();
});

afterAll(async () => {
  await worker.stop();
});
