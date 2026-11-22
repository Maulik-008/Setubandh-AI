import { setupWorker } from 'msw/browser';

/** One MSW worker shared by browser component tests. Add per-test handlers with `worker.use(...)`. */
export const worker = setupWorker();
