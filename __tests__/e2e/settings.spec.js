import { expect, test } from '@playwright/test';
import { closeOptions, openOptions, openSettings, option, quitSession, setOptions } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

const isActive = locator => expect(locator).toHaveClass(/active/);

test('setup choices are remembered after a session', async ({ page }) => {
  await option(page, 'level', 'combo').click();
  await page.locator('.combo-item').filter({ has: page.locator('.combo-check[value="3"]') }).click();
  await openOptions(page);
  await option(page, 'card-mode', 'pinyin-first').click();
  await option(page, 'order', 'desc').click();
  await page.locator('.toggle-switch').click();
  await page.locator('#range-from').fill('5');
  await page.locator('#range-to').fill('20');
  await closeOptions(page);
  await expect(page.locator('#options-summary')).toHaveText('Pinyin → Hanzi · Z→A, shuffled · Words 5–20');
  await page.locator('#btn-start').click();
  await expect(page.locator('#fc-total')).toHaveText('16');
  await quitSession(page);

  await page.reload();
  await isActive(option(page, 'level', 'combo'));
  await expect(page.locator('#combo-panel')).toHaveClass(/visible/);
  await expect(page.locator('.combo-check:checked')).toHaveCount(3); // 1 + 2 by default, + 3
  await expect(page.locator('#options-summary')).toHaveText('Pinyin → Hanzi · Z→A, shuffled · Words 5–20');
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
  await openOptions(page);
  await page.locator('#custom-count').fill('40');
  await closeOptions(page);
  await expect(page.locator('#options-summary')).toHaveText('Hanzi → Pinyin · Random · 40 words');
  await page.locator('#btn-start').click();
  await quitSession(page);
  await page.reload();
  await expect(page.locator('#custom-count')).toHaveValue('40');
  await expect(page.locator('[data-group="count"].active')).toHaveCount(0);
});

test('reset settings restores the defaults and the system theme, but keeps progress', async ({ page }) => {
  await option(page, 'level', '3').click();
  await setOptions(page, { order: 'asc' });
  await page.locator('#btn-start').click();
  await page.keyboard.press('k');
  await quitSession(page);

  await openSettings(page);
  await option(page, 'theme', 'dark').click();
  await page.locator('#btn-reset-settings').click();
  await isActive(option(page, 'theme', 'system'));
  await page.locator('#btn-close-settings').click();
  await isActive(option(page, 'level', '1'));
  await expect(page.locator('#options-summary')).toHaveText('Hanzi → Pinyin · Random · 25 words');
  await expect(page.locator('#review-section')).toBeVisible(); // progress kept

  await page.reload();
  await isActive(option(page, 'level', '1'));
});

test.describe('session options sheet', () => {
  test('closes with Done, Esc, a tap outside and the back button', async ({ page }) => {
    const sheet = page.locator('#options-sheet');
    await openOptions(page);
    await closeOptions(page);

    await openOptions(page);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();

    await openOptions(page);
    await page.mouse.click(5, 5); // the backdrop, above the sheet
    await expect(sheet).toBeHidden();

    await openOptions(page);
    await page.goBack();
    await expect(sheet).toBeHidden();
    await expect(page.locator('#setup-screen')).toBeVisible(); // still in the app
  });

  test('closes with a swipe down on its header', async ({ page }) => {
    await openOptions(page);
    const header = page.locator('.sheet-header');
    const box = await header.boundingBox();
    const touch = y => ({ identifier: 0, clientX: box.x + 100, clientY: y });
    await header.dispatchEvent('touchstart', { touches: [touch(box.y + 10)] });
    await header.dispatchEvent('touchmove', { touches: [touch(box.y + 150)] });
    await header.dispatchEvent('touchend', { changedTouches: [touch(box.y + 150)] });
    await expect(page.locator('#options-sheet')).toBeHidden();
  });
});

test('the back button leaves the settings page, not the app', async ({ page }) => {
  await openSettings(page);
  await page.goBack();
  await expect(page.locator('#setup-screen')).toBeVisible();

  await openSettings(page);
  await page.locator('#btn-close-settings').click();
  await expect(page.locator('#setup-screen')).toBeVisible();
  // The in-app button went back through history too, so no stale entry is left
  expect(await page.evaluate(() => history.state)).toBeNull();
});

test.describe('theme', () => {
  const theme = page => page.locator('html');

  test.beforeEach(async ({ page }) => {
    await openSettings(page);
  });

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
