import { COLOR_SCHEMES, expect, mockSignedInApi, test } from './fixtures';

/**
 * M1-13 acceptance on the signed-in app (mocked API):
 * - every screen and settings tab has a URL that deep-links, and browser back works;
 * - axe clean in both colour modes at 375 and 1280 (the sweep runs once, Chromium desktop);
 * - screenshot baselines of key screens (CI-owned, see docs/testing.md).
 */
const APP_SCREENS = [
  { path: '/', heading: 'Home', level: 1 },
  { path: '/inbox', heading: 'Inbox', level: 1 },
  { path: '/settings/workspace', heading: 'Workspace profile', level: 2 },
  { path: '/settings/members', heading: 'Members', level: 2 },
  { path: '/settings/channels', heading: 'Channels', level: 2 },
  { path: '/settings/saved-replies', heading: 'Saved replies', level: 2 },
  { path: '/settings/profile', heading: 'Your profile', level: 2 },
] as const;

for (const colorScheme of COLOR_SCHEMES) {
  test.describe(`signed-in app in ${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('AC: every app screen is axe clean at 375 and 1280, without sideways scrolling', async ({
      page,
      expectAccessible,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop', 'viewport sweep runs once');
      await mockSignedInApi(page);
      for (const width of [375, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        for (const screen of APP_SCREENS) {
          await page.goto(screen.path);
          await expect(
            page.getByRole('heading', { level: screen.level, name: screen.heading }).first(),
          ).toBeVisible();
          await page.waitForLoadState('networkidle');
          await expectAccessible();
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          expect(overflow, `${screen.path} at ${width}px scrolls sideways`).toBeLessThanOrEqual(0);
        }
      }
    });

    test('key screens match their baselines', async ({ page }) => {
      await mockSignedInApi(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`home-${colorScheme}.png`, { fullPage: true });
      await page.goto('/settings/members');
      await expect(page.getByText('Ravi Kumar').first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`members-${colorScheme}.png`, { fullPage: true });
    });
  });
}

test('AC: every screen has a URL; navigation and browser back work', async ({ page }) => {
  await mockSignedInApi(page);
  // Deep links.
  for (const screen of APP_SCREENS) {
    await page.goto(screen.path);
    await expect(
      page.getByRole('heading', { level: screen.level, name: screen.heading }).first(),
    ).toBeVisible();
  }
  // Navigate through the app, then walk back through history.
  await page.goto('/');
  const nav = page.getByRole('link', { name: 'Inbox' }).filter({ visible: true }).first();
  await nav.click();
  await expect(page).toHaveURL(/\/inbox$/);
  await page.getByRole('link', { name: 'Settings' }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/settings\/workspace$/);
  await page.getByRole('link', { name: 'Members' }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/settings\/members$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Members' })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/settings\/workspace$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Workspace profile' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/inbox$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Inbox' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
});

test('a reload keeps the user signed in (silent refresh through the cookie)', async ({ page }) => {
  await mockSignedInApi(page);
  await page.goto('/settings/profile');
  await expect(page.getByRole('heading', { level: 2, name: 'Your profile' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 2, name: 'Your profile' })).toBeVisible();
});
