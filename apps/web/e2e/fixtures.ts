import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

export const COLOR_SCHEMES = ['light', 'dark'] as const;

export const WS_A = '01900000-0000-7000-8000-0000000000a1';
export const WS_B = '01900000-0000-7000-8000-0000000000b2';
export const ME = {
  id: '01900000-0000-7000-8000-000000000001',
  email: 'asha@example.com',
  name: 'Asha Mehta',
  emailVerified: true,
};

const OWNER_PERMISSIONS = [
  'inbox.view_all',
  'inbox.view_unassigned',
  'inbox.reply',
  'inbox.resolve',
  'inbox.assign_self',
  'inbox.assign_any',
  'contacts.edit',
  'saved_replies.manage_own',
  'saved_replies.manage_shared',
  'channels.manage',
  'members.manage',
  'workspace.settings',
  'workspace.transfer_ownership',
];

/**
 * A signed-in session against a mocked API: two workspaces (Owner of A, Agent of B), members and
 * an invitation in A. Requests that are not mocked get a 404 in the API's error shape.
 */
export async function mockSignedInApi(page: Page, options: { emailVerified?: boolean } = {}) {
  const user = { ...ME, emailVerified: options.emailVerified ?? true };
  const json = (body: unknown, status = 200) => ({ status, json: body });
  await page.route('**/v1/**', (route) =>
    route.fulfill(
      json({ error: { code: 'NOT_FOUND', message: 'Not mocked.', requestId: 'e2e' } }, 404),
    ),
  );
  await page.route('**/v1/auth/refresh', (route) =>
    route.fulfill(json({ accessToken: 'e2e-access', expiresIn: 900, user })),
  );
  await page.route('**/v1/me/last-workspace', (route) => route.fulfill({ status: 204 }));
  await page.route('**/v1/workspaces', (route) =>
    route.fulfill(
      json({
        workspaces: [
          { id: WS_A, name: 'Kesari Threads', role: 'owner' },
          { id: WS_B, name: 'Second Shop', role: 'agent' },
        ],
        lastWorkspaceId: WS_A,
      }),
    ),
  );
  await page.route('**/v1/workspace', (route) => {
    const ws = route.request().headers()['x-workspace-id'];
    const isA = ws === WS_A;
    return route.fulfill(
      json({
        id: ws,
        name: isA ? 'Kesari Threads' : 'Second Shop',
        timezone: 'Asia/Kolkata',
        country: 'IN',
        currency: 'INR',
        agentsSeeAllConversations: false,
        role: isA ? 'owner' : 'agent',
        permissions: isA
          ? OWNER_PERMISSIONS
          : [
              'inbox.view_unassigned',
              'inbox.reply',
              'inbox.resolve',
              'inbox.assign_self',
              'contacts.edit',
              'saved_replies.manage_own',
            ],
        availability: 'online',
      }),
    );
  });
}

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
