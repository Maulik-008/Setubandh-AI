// The real global stylesheet, loaded first as in main.tsx.
import '@setubandh/ui/globals.css';
import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { worker } from './msw';

// Lazy routes compile on first use (slow on a cold CI cache): give find* queries 5 s, not 1 s.
configure({ asyncUtilTimeout: 5000 });

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
