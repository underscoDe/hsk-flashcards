import { expect, test } from '@playwright/test';
import { option } from './helpers.js';

test.use({ serviceWorkers: 'allow' });

test('after one online visit, every level works offline', async ({ page, context }) => {
  await page.goto('/');
  // Wait until the service worker has pre-cached the app and all six levels (English and French meanings), and controls the page
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect.poll(() => page.evaluate(async () => {
    const keys = await caches.keys();
    const data = keys.find(k => k.startsWith('hsk-data-'));
    return data ? (await (await caches.open(data)).keys()).length : 0;
  })).toBe(12);

  await context.setOffline(true);
  // Proves the network is really cut for the service worker too: an uncached file fails
  expect(await page.evaluate(() => fetch('/README.md').then(() => 'loaded', () => 'failed'))).toBe('failed');

  await page.reload();
  await expect(page.locator('#setup-screen')).toBeVisible();
  await expect(page.locator('.btn-start')).toHaveCSS('border-radius', /[1-9]/); // CSS loaded from cache

  // HSK 6 was never opened online
  await option(page, 'level', '6').click();
  await page.locator('#btn-start').click();
  await expect(page.locator('#flashcard-screen')).toBeVisible();
  await expect(page.locator('#fc-total')).toHaveText('25');
  await expect(page.locator('#message-dialog')).not.toHaveClass(/visible/);
});
