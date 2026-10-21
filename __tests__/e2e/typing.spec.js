import { expect, test } from '@playwright/test';
import { readProgress, setOptions, startSession } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await setOptions(page, { 'card-mode': 'type-pinyin' });
  await startSession(page); // HSK 1, A→Z: 爱 ài comes first
});

const input = page => page.locator('#answer-input');

test('a right answer suggests "Got it" and Enter confirms it', async ({ page }) => {
  await expect(page.locator('#hanzi-front')).toHaveText('爱');
  await expect(page.locator('#translation-front')).toBeVisible(); // tells homographs apart
  await expect(input(page)).toBeFocused();

  await input(page).fill('ai4');
  await input(page).press('Enter');
  await expect(page.locator('#flashcard')).toHaveClass(/flipped/);
  await expect(page.locator('#answer-feedback')).toHaveText('✓ Correct');
  await expect(page.locator('#btn-know')).toHaveClass(/suggested/);
  await expect(page.locator('#btn-know')).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.locator('#fc-current')).toHaveText('2');
  await expect(page.locator('#flashcard')).not.toHaveClass(/flipped/);
  await expect(input(page)).toHaveValue('');
  await expect(input(page)).toBeFocused();
  await expect(page.locator('#answer-feedback')).toHaveText('');
  expect(Object.values(await readProgress(page))[0].box).toBe(1);
});

test('wrong tones suggest "Review again", but the other rating stays possible', async ({ page }) => {
  await input(page).fill('ai1');
  await input(page).press('Enter');
  await expect(page.locator('#answer-feedback')).toHaveText('✗ Right syllables, wrong tones');
  await expect(page.locator('#btn-review')).toHaveClass(/suggested/);
  await expect(input(page)).toHaveJSProperty('readOnly', true);

  await page.locator('#btn-know').click(); // e.g. a typo
  await expect(page.locator('#fc-current')).toHaveText('2');
  await expect(page.locator('#btn-review')).not.toHaveClass(/suggested/);
  expect(Object.values(await readProgress(page))[0].box).toBe(1);
});

test('a wrong answer suggests "Review again"', async ({ page }) => {
  await input(page).press('Enter'); // empty
  await expect(page.locator('#answer-feedback')).toHaveText('✗ Not quite');
  await page.keyboard.press('Enter');
  expect(Object.values(await readProgress(page))[0].box).toBe(0);
});

test('typing letters does not trigger the shortcuts', async ({ page }) => {
  await input(page).pressSequentially('kuzp ');
  await expect(input(page)).toHaveValue('kuzp ');
  await expect(page.locator('#fc-current')).toHaveText('1');
  await expect(page.locator('#flashcard')).not.toHaveClass(/flipped/);
  expect(await readProgress(page)).toEqual({});
});

test('the answer field only shows in typing mode', async ({ page }) => {
  await expect(page.locator('#answer-form')).toBeVisible();
  await page.locator('#btn-quit').click();
  await page.locator('#quit-confirm').click();
  await setOptions(page, { 'card-mode': 'hanzi-first' });
  await page.locator('#btn-start').click();
  await expect(page.locator('#answer-form')).toBeHidden();
});
