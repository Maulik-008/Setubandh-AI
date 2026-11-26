import { paperPastelTokens } from '@setubandh/ui/tokens';
import { COLOR_SCHEMES, expect, test } from './fixtures';

/**
 * M1-13: the auth screens, each at its own URL, axe clean in both modes at 375 and 1280.
 * The full-viewport axe sweep runs once (Chromium desktop project); the flow tests run in
 * every browser project.
 */
const AUTH_SCREENS = [
  { path: '/login', heading: 'Sign in' },
  { path: '/signup', heading: 'Create your account' },
  { path: '/forgot', heading: 'Reset your password' },
  { path: '/reset?token=' + 'r'.repeat(43), heading: 'Choose a new password' },
  { path: '/invite?token=' + 'i'.repeat(43), heading: 'Join your team' },
  { path: '/verify', heading: 'This link does not work' },
  { path: '/no/such/page', heading: 'Page not found' },
];
const WIDTHS = [375, 1280];

for (const colorScheme of COLOR_SCHEMES) {
  test.describe(`auth screens in ${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('AC: every auth screen is axe clean at 375 and 1280', async ({
      page,
      mockApi,
      expectAccessible,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop', 'viewport sweep runs once');
      await mockApi();
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        for (const screen of AUTH_SCREENS) {
          await page.goto(screen.path);
          await expect(page.getByRole('heading', { level: 1, name: screen.heading })).toBeVisible();
          await expectAccessible();
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          expect(overflow, `${screen.path} at ${width}px scrolls sideways`).toBeLessThanOrEqual(0);
        }
      }
    });

    test('paints the paper canvas and ink text', async ({ page, mockApi, computedColor }) => {
      await mockApi();
      await page.goto('/login');
      const tokens = paperPastelTokens[colorScheme];
      await expect(page.locator('html')).toHaveCSS(
        'background-color',
        await computedColor(`hsl(${tokens.background})`),
      );
      await expect(page.locator('h1')).toHaveCSS(
        'color',
        await computedColor(`hsl(${tokens.foreground})`),
      );
    });
  });
}

test('signed-out visitors are sent to sign in, and back works between auth screens', async ({
  page,
  mockApi,
}) => {
  await mockApi();
  await page.goto('/inbox');
  await expect(page).toHaveURL(/\/login\?next=%2Finbox$/);
  await page.getByRole('link', { name: 'Forgot your password?' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible();
  await expect(page).toHaveURL(/\/forgot$/);
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
});

test('keeps a manual colour choice after reload', async ({ page, mockApi }) => {
  await mockApi();
  await page.goto('/login');
  await page.getByRole('radio', { name: 'Dark' }).check();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
