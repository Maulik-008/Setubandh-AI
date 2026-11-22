import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

export const COLOR_SCHEMES = ['light', 'dark'] as const;

interface Fixtures {
  /** Run axe on the current page and fail on any serious or critical violation (requirements §16). */
  expectAccessible: (options?: { include?: string; exclude?: string[] }) => Promise<void>;
  /** Mock the API health check so pages render deterministically without a backend. */
  mockApi: (page?: Page) => Promise<void>;
}

/**
 * Shared E2E fixtures. Signed-in tests (from M1-09 on) will add a `storageState`
 * fixture here that logs in once per worker and reuses the session.
 */
export const test = base.extend<Fixtures>({
  expectAccessible: async ({ page }, use) => {
    await use(async ({ include, exclude = [] } = {}) => {
      let builder = new AxeBuilder({ page }).withTags([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
        'wcag22aa',
      ]);
      if (include) builder = builder.include(include);
      for (const selector of exclude) builder = builder.exclude(selector);
      const { violations } = await builder.analyze();
      const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(
        blocking.map((v) => `${v.impact}: ${v.id} (${v.nodes.length} nodes) ${v.helpUrl}`),
        'serious or critical accessibility violations',
      ).toEqual([]);
    });
  },
  mockApi: async ({ page }, use) => {
    await use(async (target = page) => {
      await target.route('**/api/health/ready', (route) =>
        route.fulfill({ status: 200, json: { status: 'ok' } }),
      );
    });
  },
});

export { expect };
