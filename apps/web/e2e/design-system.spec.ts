import { paperPastelTokens } from '@setubandh/ui/tokens';
import { COLOR_SCHEMES, expect, test } from './fixtures';

/**
 * M1-05 acceptance: the Paper & Pastel look on Astryx in both modes (white paper / ink,
 * one ink button, pastel chips), axe clean in every state, and a screenshot baseline.
 */
for (const colorScheme of COLOR_SCHEMES) {
  test.describe(`design system page in ${colorScheme} mode`, () => {
    test.use({ colorScheme });
    const tokens = paperPastelTokens[colorScheme];

    test.beforeEach(async ({ page, mockApi }) => {
      await mockApi();
      await page.goto('/');
      await expect(page.getByText('API is reachable.')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
    });

    test('has exactly one ink button, and it is the main action', async ({
      page,
      computedColor,
    }) => {
      const ink = await computedColor(`hsl(${tokens.cta})`);
      const filled = await page
        .getByRole('button')
        .evaluateAll(
          (buttons, color) =>
            buttons
              .filter((button) => getComputedStyle(button).backgroundColor === color)
              .map((button) => button.textContent?.trim()),
          ink,
        );
      expect(filled).toEqual(['Add a channel']);
      const cta = page.getByRole('button', { name: 'Add a channel' });
      await expect(cta).toHaveCSS('color', await computedColor(`hsl(${tokens['cta-foreground']})`));
      await expect(cta).toHaveCSS('border-radius', '9999px');
    });

    test('paints category cards with the pastel tints', async ({ page, computedColor }) => {
      const card = page
        .getByText('Reply mode')
        .first()
        .locator('xpath=ancestor::*[contains(@class,"astryx-card")][1]');
      await expect(card).toHaveCSS(
        'background-color',
        await computedColor(`hsl(${tokens['tint-violet']})`),
      );
      await expect(page.getByRole('heading', { name: 'One ink pill per view' })).toHaveCSS(
        'font-family',
        /Geist Variable/,
      );
    });

    test('has no serious or critical accessibility issues', async ({ expectAccessible }) => {
      await expectAccessible();
    });

    test('has no accessibility issues in the table loading, empty and error states', async ({
      page,
      expectAccessible,
    }) => {
      for (const state of ['Loading', 'Empty', 'Error']) {
        await page.getByRole('radio', { name: state }).check();
        await expectAccessible();
      }
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    });

    test('has no accessibility issues with the dialog open', async ({ page, expectAccessible }) => {
      await page.getByRole('button', { name: 'Add a channel' }).click();
      await expect(page.getByRole('dialog', { name: 'Add a channel' })).toBeVisible();
      await expectAccessible();
    });

    test('matches the visual baseline', async ({ page }) => {
      await expect(page).toHaveScreenshot(`design-system-${colorScheme}.png`, { fullPage: true });
    });
  });
}

test('the dialog validates on submit, then confirms with a toast', async ({ page, mockApi }) => {
  await mockApi();
  await page.goto('/');
  await page.getByRole('button', { name: 'Add a channel' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a channel' });
  await dialog.getByRole('button', { name: 'Connect channel' }).click();
  // Astryx repeats the message in a live region, so take the visible one.
  await expect(dialog.getByText('Enter the name customers see').first()).toBeVisible();
  await dialog.getByRole('textbox', { name: /Display name/ }).fill('Kesari Threads');
  await dialog.getByRole('button', { name: 'Connect channel' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('WhatsApp connected as Kesari Threads.').first()).toBeVisible();
});

test('a removal can be undone from the toast', async ({ page, mockApi }) => {
  await mockApi();
  await page.goto('/');
  await page.getByRole('button', { name: 'Remove Instagram' }).click();
  await expect(page.getByText('Instagram removed from this workspace.').first()).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: 'Remove Instagram' })).toBeVisible();
});

test('the empty state offers the next step', async ({ page, mockApi }) => {
  await mockApi();
  await page.goto('/');
  await page.getByRole('radio', { name: 'Empty' }).check();
  await expect(page.getByRole('heading', { name: 'No conversations yet' })).toBeVisible();
  await page.getByRole('button', { name: 'Connect a channel' }).click();
  await expect(page.getByRole('cell', { name: /Ananya Rao/ })).toBeVisible();
});
