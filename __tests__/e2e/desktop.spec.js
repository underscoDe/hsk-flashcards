import { expect, test } from '@playwright/test';
import { option, quitSession, rate } from './helpers.js';

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('the home shows session options inline, without the sheet', async ({ page }) => {
  await expect(page.locator('.site-nav')).toBeVisible();
  await expect(page.locator('#btn-open-settings')).toBeHidden();
  await expect(page.locator('#btn-open-options')).toBeHidden();

  await option(page, 'card-mode', 'pinyin-first').click();
  await option(page, 'order', 'asc').click();
  await option(page, 'count', '10').click();
  await page.locator('#btn-start').click();
  await expect(page.locator('#fc-total')).toHaveText('10');
  await expect(page.locator('#pinyin-front')).toBeVisible();
});

test('the top navigation switches between home and settings', async ({ page }) => {
  const home = page.locator('#nav-home');
  const settings = page.locator('#nav-settings');

  await settings.click();
  await expect(page.locator('#settings-screen')).toBeVisible();
  await expect(page.locator('#btn-close-settings')).toBeHidden(); // the navigation replaces it
  await settings.click(); // already there: no extra history entry
  await home.click();
  await expect(page.locator('#setup-screen')).toBeVisible();
  expect(await page.evaluate(() => history.state)).toBeNull();
});

test('sessions hide the navigation and show progress on the side', async ({ page }) => {
  await option(page, 'order', 'asc').click();
  await option(page, 'count', '10').click();
  await page.locator('#btn-start').click();
  await expect(page.locator('.site-nav')).toBeHidden();
  await expect(page.locator('.session-panel')).toBeVisible();
  await expect(page.locator('#sp-left')).toHaveText('10');

  await rate(page, 'known');
  await rate(page, 'unknown');
  await expect(page.locator('#sp-known')).toHaveText('1');
  await expect(page.locator('#sp-review')).toHaveText('1');
  await expect(page.locator('#sp-left')).toHaveText('8');

  await quitSession(page);
  await expect(page.locator('.site-nav')).toBeVisible();
});

test('the keyboard help mentions Enter only in typing mode', async ({ page }) => {
  const enterRow = page.locator('.session-keys .kbd-type-mode');
  await page.locator('#btn-start').click();
  await expect(enterRow).toBeHidden();
  await quitSession(page);

  await option(page, 'card-mode', 'type-pinyin').click();
  await page.locator('#btn-start').click();
  await expect(enterRow).toBeVisible();
});
