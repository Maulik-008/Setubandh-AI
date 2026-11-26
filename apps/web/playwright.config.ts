import { defineConfig, devices, type Project } from '@playwright/test';

/**
 * End-to-end tests against the built web app (requirements §16).
 *
 * - Browsers: Chromium, Firefox, WebKit. Narrow with E2E_BROWSERS=chromium,webkit.
 * - Viewports: desktop and phone for every browser.
 * - Colour mode: each test sets `colorScheme` (see e2e/fixtures.ts).
 * - Failure evidence: trace, screenshot and video are kept for failed tests.
 * - PLAYWRIGHT_CHROMIUM_EXECUTABLE reuses a pre-installed Chromium (cloud sandboxes).
 * - E2E_VIDEO=off skips video recording where Playwright's ffmpeg is not installed.
 * - E2E_UPDATE_SNAPSHOTS=missing writes baselines that do not exist yet (CI uploads them for
 *   review) instead of failing; existing baselines are still compared.
 */
const PORT = 4173;
const isCI = Boolean(process.env.CI);
const recordVideo = process.env.E2E_VIDEO !== 'off';
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

const allBrowsers = ['chromium', 'firefox', 'webkit'] as const;
type Browser = (typeof allBrowsers)[number];
const selected = (process.env.E2E_BROWSERS ?? allBrowsers.join(','))
  .split(',')
  .map((name) => name.trim())
  .filter((name): name is Browser => (allBrowsers as readonly string[]).includes(name));

const desktop: Record<Browser, Project['use']> = {
  chromium: { ...devices['Desktop Chrome'], launchOptions: { executablePath: chromiumExecutable } },
  firefox: { ...devices['Desktop Firefox'] },
  webkit: { ...devices['Desktop Safari'] },
};
// Firefox has no mobile emulation, so its "phone" project is a phone-sized viewport.
const phone: Record<Browser, Project['use']> = {
  chromium: { ...devices['Pixel 7'], launchOptions: { executablePath: chromiumExecutable } },
  firefox: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 } },
  webkit: { ...devices['iPhone 15'] },
};

export default defineConfig({
  updateSnapshots: process.env.E2E_UPDATE_SNAPSHOTS === 'missing' ? 'missing' : 'none',
  testDir: './e2e',
  outputDir: './test-results',
  // Baselines are per OS: CI (linux) owns the committed ones; other machines write their own.
  snapshotPathTemplate:
    '{testDir}/__screenshots__/{platform}/{projectName}/{testFilePath}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: recordVideo ? 'retain-on-failure' : 'off',
  },
  projects: selected.flatMap((browser) => [
    { name: `${browser}-desktop`, use: desktop[browser] },
    { name: `${browser}-phone`, use: phone[browser] },
  ]),
  webServer: {
    // An e2e-mode build: production code plus the dev-only design-system page (M1-05 checks).
    command: `pnpm exec vite build --mode e2e --outDir dist-e2e && pnpm exec vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Never reuse: a leftover server would serve a stale build.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
