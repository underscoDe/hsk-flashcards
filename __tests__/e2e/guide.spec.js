import { expect, test } from '@playwright/test';
import { openGuide } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

const search  = page => page.locator('#guide-search');
const visible = page => page.locator('.guide-item:visible');

test('topics open and close', async ({ page }) => {
  await openGuide(page);
  const topic = page.locator('.guide-item').filter({ hasText: 'Undo a rating' });
  await expect(topic.locator('.guide-answer')).toBeHidden();
  await topic.locator('summary').click();
  await expect(topic.locator('.guide-answer')).toBeVisible();
});

test('search keeps, opens and highlights the matching topics, accents aside', async ({ page }) => {
  await openGuide(page);
  await search(page).fill('ni hao');
  await expect(visible(page)).toHaveCount(1);
  await expect(visible(page).locator('summary')).toHaveText('How to type pinyin and tones');
  await expect(visible(page).locator('.guide-answer')).toBeVisible();
  await expect(visible(page).locator('mark').first()).toHaveText('nǐ');
  await expect(page.locator('#guide-status')).toHaveText('1 topic found');
  await expect(page.locator('.guide-section:visible')).toHaveCount(1);
  await expect(page.locator('.guide-toc')).toBeHidden();

  await search(page).fill('');
  await expect(visible(page)).toHaveCount(await page.locator('.guide-item').count());
  await expect(page.locator('#guide-screen mark')).toHaveCount(0);
  await expect(page.locator('.guide-answer:visible')).toHaveCount(0);
});

test('a search without results says so', async ({ page }) => {
  await openGuide(page);
  await search(page).fill('xyzzy');
  await expect(visible(page)).toHaveCount(0);
  await expect(page.locator('#guide-empty')).toBeVisible();
  await expect(page.locator('#guide-status')).toHaveText('');
});

test('topic links scroll to their section without adding history entries', async ({ page }) => {
  await openGuide(page);
  const historyLength = await page.evaluate(() => history.length);
  await page.locator('.guide-toc-link', { hasText: 'Settings and data' }).click();
  await expect(page.locator('#guide-data')).toBeInViewport();
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
});

test('the back buttons return home, and the guide reopens fresh', async ({ page }) => {
  await openGuide(page);
  await search(page).fill('tones');
  await page.goBack();
  await expect(page.locator('#setup-screen')).toBeVisible();
  expect(await page.evaluate(() => history.state)).toBeNull();

  await openGuide(page);
  await expect(search(page)).toHaveValue('');
  await page.locator('#btn-close-guide').click();
  await expect(page.locator('#setup-screen')).toBeVisible();
  expect(await page.evaluate(() => history.state)).toBeNull();
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('the navigation switches between pages and home stays one step back', async ({ page }) => {
    await page.locator('#nav-guide').click();
    await page.keyboard.press('/');
    await expect(search(page)).toBeFocused();

    await page.locator('#nav-settings').click();
    await expect(page.locator('#settings-screen')).toBeVisible();
    await page.locator('#nav-guide').click();
    await expect(page.locator('#guide-screen')).toBeVisible();

    await page.goBack();
    await expect(page.locator('#setup-screen')).toBeVisible();
    expect(await page.evaluate(() => history.state)).toBeNull();

    await page.locator('#nav-guide').click();
    await page.locator('#nav-home').click();
    await expect(page.locator('#setup-screen')).toBeVisible();
    expect(await page.evaluate(() => history.state)).toBeNull();
  });
});
