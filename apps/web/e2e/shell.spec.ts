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

    test('follows the system colour mode', async ({ page }) => {
      await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
    });

    test('has no serious or critical accessibility issues', async ({ expectAccessible }) => {
      await expectAccessible();
    });

    test('matches the visual baseline', async ({ page }) => {
      await expect(page.getByText('API is reachable.')).toBeVisible();
      await expect(page).toHaveScreenshot(`shell-${colorScheme}.png`, { fullPage: true });
    });
  });
}

test('shows an alert when the API is down', async ({ page }) => {
  await page.route('**/api/health/ready', (route) => route.fulfill({ status: 503, json: {} }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('The API is not reachable right now');
});

test('keeps a manual colour choice after reload', async ({ page, mockApi }) => {
  await mockApi();
  await page.goto('/');
  await page.getByRole('radio', { name: 'Dark' }).check();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
