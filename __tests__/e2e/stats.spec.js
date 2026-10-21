import { expect, test } from '@playwright/test';
import { openSettings, quitSession, rate, rateAllKnown, startSession } from './helpers.js';

const DAY_0 = new Date(2026, 9, 21, 10, 0);
const day = n => new Date(2026, 9, 21 + n, 10, 0);

const statsLink = page => page.locator('#btn-open-stats');

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(DAY_0);
  await page.goto('/');
});

/** Opens the stats from the home review card, like on a phone. */
async function openStats(page) {
  await statsLink(page).click();
  await expect(page.locator('#stats-screen')).toBeVisible();
}

test('a session shows up in the stats and starts a streak', async ({ page }) => {
  await startSession(page);
  await rateAllKnown(page, 10);
  await page.locator('#btn-new-config').click();
  await expect(statsLink(page)).toHaveText('🔥 1-day streak · Stats ›');

  await openStats(page);
  await expect(page.locator('#streak-current')).toHaveText('1 day');
  await expect(page.locator('#streak-text')).toHaveText('Current streak, keep it up!');
  await expect(page.locator('#st-today')).toHaveText('10');
  await expect(page.locator('#st-seen')).toHaveText('10');
  await expect(page.locator('#st-mastered')).toHaveText('0');
  await expect(page.locator('.chart-day')).toHaveCount(30);
  await expect(page.locator('#chart-detail')).toHaveText('Today: 10 cards, 10 new');
  await expect(page.locator('#chart-summary')).toHaveText('10 cards over 1 day, 10 of them new words.');

  await page.locator('.chart-day').first().click();
  await expect(page.locator('#chart-detail')).toHaveText('Sep 22: no cards');

  await page.goBack();
  await expect(page.locator('#setup-screen')).toBeVisible();
  expect(await page.evaluate(() => history.state)).toBeNull();
});

test('undo takes the rating out of the stats', async ({ page }) => {
  await startSession(page);
  await rate(page, 'known');
  await rate(page, 'unknown');
  await page.locator('#btn-undo').click();
  await quitSession(page);

  await openStats(page);
  await expect(page.locator('#st-today')).toHaveText('1');
  await expect(page.locator('#chart-detail')).toHaveText('Today: 1 card, 1 new');
});

test('words seen again are not new, and the streak lasts until a day is missed', async ({ page }) => {
  test.slow(); // sessions across simulated days
  await startSession(page);
  await rateAllKnown(page, 10);
  await page.locator('#btn-new-config').click();

  // Next day: the streak is still alive, but asks to be continued
  await page.clock.setFixedTime(day(1));
  await page.reload();
  await expect(statsLink(page)).toHaveText('🔥 1-day streak · Stats ›');
  await openStats(page);
  await expect(page.locator('#streak-text')).toHaveText('Rate a card today to keep it going');
  await page.goBack();

  await page.locator('#btn-review-today').click();
  await rateAllKnown(page, 10);
  await page.locator('#btn-new-config').click();
  await openStats(page);
  await expect(page.locator('#streak-current')).toHaveText('2 days');
  await expect(page.locator('#chart-detail')).toHaveText('Today: 10 cards, 0 new');
  await expect(page.locator('#chart-summary')).toHaveText('20 cards over 2 days, 10 of them new words.');

  // A day missed: the streak is over, the best one is kept
  await page.clock.setFixedTime(day(3));
  await page.reload();
  await expect(statsLink(page)).toHaveText('See your stats ›');
  await openStats(page);
  await expect(page.locator('#streak-current')).toHaveText('0 days');
  await expect(page.locator('#streak-best')).toHaveText('2');
  await expect(page.locator('#streak-text')).toHaveText('Rate a card today to start a streak');
});

test('reset progress clears the stats too', async ({ page }) => {
  await startSession(page);
  await rateAllKnown(page, 10);
  await page.locator('#btn-new-config').click();

  await openSettings(page);
  await page.locator('#btn-reset-progress').click();
  await page.locator('#reset-dialog .dialog-btn-confirm').click();
  expect(await page.evaluate(() => localStorage.getItem('hsk-activity'))).toBe('{}');
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('the navigation opens the stats, and hovering a bar shows its day', async ({ page }) => {
    await page.locator('#nav-stats').click();
    await expect(page.locator('#stats-screen')).toBeVisible();
    await expect(page.locator('#chart-summary')).toHaveText('No cards rated in the last 30 days yet.');

    await page.locator('.chart-day').nth(28).hover();
    await expect(page.locator('#chart-detail')).toHaveText('Oct 20: no cards');

    await page.locator('#nav-home').click();
    await expect(page.locator('#setup-screen')).toBeVisible();
    expect(await page.evaluate(() => history.state)).toBeNull();
  });
});
