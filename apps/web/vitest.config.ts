import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { msw } from 'msw/vite';
import { defineConfig } from 'vitest/config';
import { unitProject } from '@setubandh/config/vitest';

// Sandboxes can point at a pre-installed Chromium instead of running `playwright install`.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  test: {
    projects: [
      unitProject({ plugins: [react()] }),
      {
        plugins: [react(), tailwindcss(), msw({ mode: 'worker-only' })],
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.tsx', 'test/**/*.browser.test.tsx'],
          setupFiles: ['./src/test/setup.browser.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ launchOptions: { executablePath } }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
