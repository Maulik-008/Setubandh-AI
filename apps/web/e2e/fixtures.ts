import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

export const COLOR_SCHEMES = ['light', 'dark'] as const;

interface Fixtures {
  /** Run axe on the current page and fail on any serious or critical violation (requirements §16). */
  expectAccessible: (options?: { include?: string; exclude?: string[] }) => Promise<void>;
  /** Mock the API so pages render deterministically without a backend (signed out by default). */
  mockApi: (page?: Page) => Promise<void>;
  /** What the browser computes for a CSS colour (e.g. `hsl(222 20% 12%)`), to compare with computed styles. */
  computedColor: (css: string) => Promise<string>;
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
        blocking.map(
          (v) =>
            `${v.impact}: ${v.id} (${v.nodes.length} nodes: ${v.nodes
              .slice(0, 3)
              .map((n) => n.target.join(' '))
              .join(' | ')}) ${v.helpUrl}`,
        ),
        'serious or critical accessibility violations',
      ).toEqual([]);
    });
  },
  mockApi: async ({ page }, use) => {
    await use(async (target = page) => {
      await target.route('**/v1/auth/refresh', (route) =>
        route.fulfill({
          status: 401,
          json: {
            error: {
              code: 'SESSION_REVOKED',
              message: 'Your session has ended.',
              requestId: 'e2e',
            },
          },
        }),
      );
    });
  },
  computedColor: async ({ page }, use) => {
    await use((css) =>
      page.evaluate((value) => {
        const probe = document.createElement('span');
        probe.style.color = value;
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      }, css),
    );
  },
});

export { expect };
