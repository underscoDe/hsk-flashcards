import { expect, test } from '@playwright/test';
import { option, quitSession } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

const isActive = locator => expect(locator).toHaveClass(/active/);

test('setup choices are remembered after a session', async ({ page }) => {
  await option(page, 'level', 'combo').click();
  await page.locator('.combo-item').filter({ has: page.locator('.combo-check[value="3"]') }).click();
  await option(page, 'card-mode', 'pinyin-first').click();
  await option(page, 'order', 'desc').click();
  await page.locator('.toggle-switch').click();
  await page.locator('#range-from').fill('5');
  await page.locator('#range-to').fill('20');
  await page.locator('#btn-start').click();
  await expect(page.locator('#fc-total')).toHaveText('16');
  await quitSession(page);

  await page.reload();
  await isActive(option(page, 'level', 'combo'));
  await expect(page.locator('#combo-panel')).toHaveClass(/visible/);
  await expect(page.locator('.combo-check:checked')).toHaveCount(3); // 1 + 2 by default, + 3
  await isActive(option(page, 'card-mode', 'pinyin-first'));
  await isActive(option(page, 'order', 'desc'));
  await expect(page.locator('#toggle-shuffle')).toBeChecked();
  await expect(page.locator('#range-from')).toHaveValue('5');
  await expect(page.locator('#range-to')).toHaveValue('20');
  await expect(page.locator('#range-hint')).toHaveText(/Words 5–20 selected/);
});

test('choices are not saved until a session starts', async ({ page }) => {
  await option(page, 'level', '4').click();
  await page.reload();
  await isActive(option(page, 'level', '1'));
});

test('a custom amount is remembered', async ({ page }) => {
  await page.locator('#custom-count').fill('40');
  await page.locator('#btn-start').click();
  await quitSession(page);
  await page.reload();
  await expect(page.locator('#custom-count')).toHaveValue('40');
  await expect(page.locator('[data-group="count"].active')).toHaveCount(0);
});

test('reset settings restores the defaults and the system theme, but keeps progress', async ({ page }) => {
  await option(page, 'level', '3').click();
  await option(page, 'order', 'asc').click();
  await option(page, 'theme', 'dark').click();
  await page.locator('#btn-start').click();
  await page.keyboard.press('k');
  await quitSession(page);

  await page.locator('#btn-reset-settings').click();
  await isActive(option(page, 'level', '1'));
  await isActive(option(page, 'order', 'random'));
  await isActive(option(page, 'count', '25'));
  await isActive(option(page, 'theme', 'system'));
  await expect(page.locator('#review-section')).toBeVisible(); // progress kept

  await page.reload();
  await isActive(option(page, 'level', '1'));
});

test.describe('theme', () => {
  const theme = page => page.locator('html');

  test('follows the system by default', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await expect(theme(page)).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(theme(page)).toHaveAttribute('data-theme', 'light');
  });

  test('a forced choice wins over the system and survives a reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await option(page, 'theme', 'dark').click();
    await expect(theme(page)).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#121419');

    await page.reload();
    await expect(theme(page)).toHaveAttribute('data-theme', 'dark');
    await isActive(option(page, 'theme', 'dark'));
  });

  test('is applied before the app scripts run (no flash)', async ({ page }) => {
    await option(page, 'theme', 'dark').click();
    // Block the modules: only the inline <head> script can set the theme
    await page.route('**/js/*.js', route => route.abort());
    await page.reload();
    await expect(theme(page)).toHaveAttribute('data-theme', 'dark');
  });
});
