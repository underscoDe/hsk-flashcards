import { expect } from '@playwright/test';

/** A setup option button, e.g. option(page, 'level', '3'). */
export function option(page, group, value) {
  return page.locator(`[data-group="${group}"][data-value="${value}"]`);
}

/** Opens the session options sheet (card mode, order, count, range). */
export async function openOptions(page) {
  await page.locator('#btn-open-options').click();
  await expect(page.locator('#options-sheet')).toBeVisible();
}

export async function closeOptions(page) {
  await page.locator('#btn-close-options').click();
  await expect(page.locator('#options-sheet')).toBeHidden();
}

/** Picks session options in the sheet, e.g. setOptions(page, { 'card-mode': 'type-pinyin' }). */
export async function setOptions(page, choices) {
  await openOptions(page);
  for (const [group, value] of Object.entries(choices)) await option(page, group, value).click();
  await closeOptions(page);
}

/** Opens the settings page (theme, resets). */
export async function openSettings(page) {
  await page.locator('#btn-open-settings').click();
  await expect(page.locator('#settings-screen')).toBeVisible();
}

/** Starts a session from the setup screen; A→Z by default so the words are predictable. */
export async function startSession(page, { level = '1', order = 'asc', count = '10' } = {}) {
  await option(page, 'level', level).click();
  await setOptions(page, { order, count });
  await page.locator('#btn-start').click();
  await expect(page.locator('#flashcard-screen')).toBeVisible();
}

/** Flips the current card if needed and rates it, like a user would. */
export async function rate(page, verdict) {
  const card = page.locator('#flashcard');
  if (!(await card.getAttribute('class')).includes('flipped')) await card.click();
  await page.locator(verdict === 'known' ? '#btn-know' : '#btn-review').click();
}

/** Rates `count` cards as known with the K shortcut: fast, no flip animation to wait for. */
export async function rateAllKnown(page, count) {
  for (let i = 0; i < count; i++) await page.keyboard.press('k');
}

export async function quitSession(page) {
  await page.locator('#btn-quit').click();
  await page.locator('#quit-confirm').click();
  await expect(page.locator('#setup-screen')).toBeVisible();
}

/** Saved spaced-repetition state, as stored by js/progress.js. */
export function readProgress(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('hsk-progress') ?? '{}'));
}

/** Opens the guide from the home header. */
export async function openGuide(page) {
  await page.locator('#btn-open-guide').click();
  await expect(page.locator('#guide-screen')).toBeVisible();
}
