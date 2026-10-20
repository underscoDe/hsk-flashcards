import { expect, test } from '@playwright/test';
import { option, quitSession, rate, startSession } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('a full session ends on the results with the right counts', async ({ page }) => {
  await startSession(page);
  await expect(page.locator('#fc-total')).toHaveText('10');
  await expect(page.locator('#hanzi-front')).toHaveText('爱'); // first word A→Z in HSK 1

  for (let i = 0; i < 10; i++) await rate(page, i < 7 ? 'known' : 'unknown');

  await expect(page.locator('#results-screen')).toBeVisible();
  await expect(page.locator('#r-total')).toHaveText('10');
  await expect(page.locator('#r-known')).toHaveText('7');
  await expect(page.locator('#r-review')).toHaveText('3');
  await expect(page.locator('#r-promoted')).toHaveText(/7 words moved/);
});

test('"Review missed words" includes skipped words', async ({ page }) => {
  await startSession(page);
  await rate(page, 'known');
  await rate(page, 'unknown');
  for (let i = 0; i < 8; i++) await page.locator('#btn-next').click(); // skip the rest

  await page.locator('#btn-retry-unknown').click();
  await expect(page.locator('#fc-total')).toHaveText('9');
});

test('"Restart this session" replays the same words', async ({ page }) => {
  await startSession(page);
  const firstWord = await page.locator('#hanzi-front').textContent();
  for (let i = 0; i < 10; i++) await rate(page, 'known');

  await page.locator('#btn-restart').click();
  await expect(page.locator('#fc-total')).toHaveText('10');
  await expect(page.locator('#hanzi-front')).toHaveText(firstWord);
});

test('homographs are tracked separately (得 de / 得 děi)', async ({ page }) => {
  await startSession(page, { level: '2', count: 'all' });
  const card = page.locator('#hanzi-front');

  // Rate 得 de, then reach 得 děi: it must not inherit the "Got it" badge
  while ((await card.textContent()) !== '得') await page.locator('#btn-next').click();
  await rate(page, 'known');
  await expect(card).toHaveText('得');
  await expect(page.locator('#card-status-front')).toHaveText('');
});

test('undo restores the previous card, answer side up, from the card and the results', async ({ page }) => {
  await startSession(page);
  await expect(page.locator('#btn-undo')).toBeDisabled();

  await rate(page, 'known');
  await rate(page, 'unknown');
  await page.locator('#btn-undo').click();
  await expect(page.locator('#fc-current')).toHaveText('2');
  await expect(page.locator('#flashcard')).toHaveClass(/flipped/);

  await page.keyboard.press('z');
  await expect(page.locator('#fc-current')).toHaveText('1');

  for (let i = 0; i < 10; i++) await rate(page, 'known');
  await expect(page.locator('#results-screen')).toBeVisible();
  await page.locator('#btn-undo-results').click();
  await expect(page.locator('#fc-current')).toHaveText('10');
  await expect(page.locator('#assess-row')).toHaveClass(/visible/);
});

test('keyboard shortcuts flip and rate', async ({ page }) => {
  await startSession(page);
  await page.keyboard.press(' ');
  await expect(page.locator('#flashcard')).toHaveClass(/flipped/);
  await page.keyboard.press('k');
  await expect(page.locator('#fc-current')).toHaveText('2');
  await page.keyboard.press('u');
  await expect(page.locator('#fc-current')).toHaveText('3');
});

test('quitting asks for confirmation and keeps rated cards', async ({ page }) => {
  await startSession(page);
  await rate(page, 'known');

  await page.locator('#btn-quit').click();
  await expect(page.locator('#quit-dialog')).toHaveClass(/visible/);
  await page.locator('#quit-cancel').click();
  await expect(page.locator('#flashcard-screen')).toBeVisible();

  await quitSession(page);
  await expect(page.locator('#review-section')).toBeVisible();
});

test('combo mode without a level shows an inline hint instead of starting', async ({ page }) => {
  await option(page, 'level', 'combo').click(); // HSK 1 + 2 ticked by default
  const comboLabel = level => page.locator('.combo-item').filter({ has: page.locator(`.combo-check[value="${level}"]`) });
  await comboLabel('1').click();
  await comboLabel('2').click();
  await expect(page.locator('.combo-check:checked')).toHaveCount(0);

  await page.locator('#btn-start').click();
  await expect(page.locator('#combo-hint')).toBeVisible();
  await expect(page.locator('#setup-screen')).toBeVisible();

  await comboLabel('2').click();
  await expect(page.locator('#combo-hint')).toBeHidden();
});

test('combo sessions show the level badge on each card', async ({ page }) => {
  await option(page, 'level', 'combo').click(); // HSK 1 + 2 ticked by default
  await page.locator('#btn-start').click();
  await expect(page.locator('#word-level-front')).toHaveText(/^HSK [12]$/);
});
