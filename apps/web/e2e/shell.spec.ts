import { paperPastelTokens } from '@setubandh/ui/tokens';
import { COLOR_SCHEMES, expect, test } from './fixtures';

for (const colorScheme of COLOR_SCHEMES) {
  test.describe(`web shell in ${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test.beforeEach(async ({ page, mockApi }) => {
      await mockApi();
      await page.goto('/');
    });

    test('shows the product name and API status', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 1, name: 'Setubandh AI' })).toBeVisible();
      await expect(page.getByText('API is reachable.')).toBeVisible();
    });

    test('follows the system colour mode by default', async ({ page, computedColor }) => {
      await expect(page.getByRole('radio', { name: 'System' })).toBeChecked();
      // Astryx <Theme mode="system"> leaves data-theme off and follows prefers-color-scheme.
      await expect(page.locator('html')).not.toHaveAttribute('data-theme');
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

test('shows an alert when the API is down', async ({ page }) => {
  await page.route('**/api/health/ready', (route) => route.fulfill({ status: 503, json: {} }));
  await page.goto('/');
  await expect(
    page.getByRole('alert').filter({ hasText: 'The API is not reachable right now' }),
  ).toContainText('try again in a minute');
});

test('keeps a manual colour choice after reload', async ({ page, mockApi }) => {
  await mockApi();
  await page.goto('/');
  await page.getByRole('radio', { name: 'Dark' }).check();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
