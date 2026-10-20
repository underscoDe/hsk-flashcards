import { expect, test } from '@playwright/test';
import { quitSession, rate, rateAllKnown, readProgress, startSession } from './helpers.js';

const DAY_0 = new Date(2026, 9, 21, 10, 0);
const day = n => new Date(2026, 9, 21 + n, 10, 0);

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(DAY_0);
  await page.goto('/');
});

test('progress is saved and due words come back the next day', async ({ page }) => {
  test.slow(); // several sessions across simulated days
  await expect(page.locator('#review-section')).toBeHidden(); // nothing rated yet

  await startSession(page);
  for (let i = 0; i < 10; i++) await page.keyboard.press(i < 8 ? 'k' : 'u');
  await page.locator('#btn-new-config').click();

  // Same day: only the 2 missed words are due
  await expect(page.locator('#review-text')).toHaveText('2 words to review today');
  expect(Object.keys(await readProgress(page))).toHaveLength(10);

  // Next day, after a reload: the 8 known words are due too
  await page.clock.setFixedTime(day(1));
  await page.reload();
  await expect(page.locator('#review-text')).toHaveText('10 words to review today');

  await page.locator('#btn-review-today').click();
  await expect(page.locator('#fc-total')).toHaveText('10');
  await rateAllKnown(page, 10);
  await expect(page.locator('#results-sub-header')).toHaveText('Daily review');

  await page.locator('#btn-new-config').click();
  await expect(page.locator('#review-text')).toHaveText('✓ All caught up — next review tomorrow');
});

test('knowing a word that is not due yet does not move it up', async ({ page }) => {
  await startSession(page);
  await rateAllKnown(page, 10);
  const firstRun = await readProgress(page);

  await page.locator('#btn-restart').click();
  await rateAllKnown(page, 10);

  await expect(page.locator('#r-promoted')).toBeHidden();
  expect(await readProgress(page)).toEqual(firstRun);
});

test('mastered words show on the level buttons', async ({ page }) => {
  test.slow(); // four sessions across simulated days
  await startSession(page);
  await rateAllKnown(page, 10);
  await page.locator('#btn-new-config').click();

  // Boxes 1 → 2 → 3 → 4 (mastered) at days 1, 3 and 7
  for (const n of [1, 3, 7]) {
    await page.clock.setFixedTime(day(n));
    await page.reload();
    await page.locator('#btn-review-today').click();
    await rateAllKnown(page, 10);
    await page.locator('#btn-new-config').click();
  }

  const hsk1 = page.locator('[data-group="level"][data-value="1"]');
  await expect(hsk1.locator('.level-count')).toHaveText('10/150 mastered');
  await expect(hsk1.locator('.level-progress')).toBeVisible();
});

test('reset progress asks for confirmation', async ({ page }) => {
  await startSession(page);
  await rate(page, 'known');
  await quitSession(page);

  await page.locator('#btn-reset-progress').click();
  await page.locator('#reset-dialog .dialog-btn-cancel').click();
  expect(Object.keys(await readProgress(page))).toHaveLength(1);

  await page.locator('#btn-reset-progress').click();
  await page.locator('#reset-dialog .dialog-btn-confirm').click();
  expect(await readProgress(page)).toEqual({});
  await expect(page.locator('#review-section')).toBeHidden();
});
