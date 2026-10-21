import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openSettings, rateAllKnown, startSession } from './helpers.js';

const reviewText = page => page.locator('#review-text');
const statsLink  = page => page.locator('#btn-open-stats');

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 21, 10, 0));
  await page.goto('/');
});

/** Rates 10 HSK 1 words as known, then exports them; returns the backup file's text. */
async function studyAndExport(page) {
  await startSession(page);
  await rateAllKnown(page, 10);
  await page.locator('#btn-new-config').click();
  await openSettings(page);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btn-export-progress').click(),
  ]);
  expect(download.suggestedFilename()).toBe('hsk-flashcards-backup-2026-10-21.json');
  return readFile(await download.path(), 'utf8');
}

/** Chooses a file for Import progress. */
async function chooseFile(page, text, name = 'backup.json') {
  await page.locator('#import-file').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
}

test('an exported backup brings the progress and stats back on another device', async ({ page }) => {
  const backup = await studyAndExport(page);

  // A new device: nothing saved yet
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(reviewText(page)).toBeHidden();

  await openSettings(page);
  await chooseFile(page, backup);
  await expect(page.locator('#import-dialog')).toBeVisible();
  await expect(page.locator('#import-dialog-body'))
    .toHaveText('This backup from Oct 21, 2026 has 10 words. It replaces the progress and stats on this device.');
  await page.locator('#import-dialog .dialog-btn-confirm').click();

  await expect(page.locator('#message-dialog-title')).toHaveText('Progress imported');
  await expect(page.locator('#message-dialog-body')).toHaveText('10 words and your stats are back.');
  await page.locator('#message-dialog-ok').click();

  await page.goBack();
  await expect(reviewText(page)).toHaveText('✓ All caught up — next review tomorrow');
  await expect(statsLink(page)).toHaveText('🔥 1-day streak · Stats ›');

  // Still there after a restart
  await page.reload();
  await expect(statsLink(page)).toHaveText('🔥 1-day streak · Stats ›');
});

test('cancelling the import keeps the progress', async ({ page }) => {
  await studyAndExport(page);
  const empty = JSON.stringify({ app: 'hsk-flashcards', version: 1, exportedAt: null, progress: {}, activity: {} });

  await chooseFile(page, empty);
  await expect(page.locator('#import-dialog-body'))
    .toHaveText('This backup has 0 words. It replaces the progress and stats on this device.');
  await page.locator('#import-dialog .dialog-btn-cancel').click();
  await expect(page.locator('#import-dialog')).toBeHidden();

  await page.goBack();
  await expect(reviewText(page)).toHaveText('✓ All caught up — next review tomorrow');
});

test('a file that is not a backup is refused', async ({ page }) => {
  await openSettings(page);
  await expect(page.locator('#btn-export-progress')).toBeDisabled(); // nothing to export yet
  await chooseFile(page, '{"words": []}', 'notes.json');

  await expect(page.locator('#message-dialog-title')).toHaveText('Not a backup file');
  await expect(page.locator('#import-dialog')).toBeHidden();
});

test('the "?" next to Data opens the backup topic of the guide', async ({ page }) => {
  await openSettings(page);
  await page.locator('#settings-screen .btn-help[data-guide="guide-topic-backup"]').click();

  await expect(page.locator('#guide-screen')).toBeVisible();
  await expect(page.locator('#guide-topic-backup')).toHaveAttribute('open', '');
  await expect(page.locator('#guide-topic-backup summary')).toBeInViewport();

  await page.goBack();
  await expect(page.locator('#setup-screen')).toBeVisible();
});
