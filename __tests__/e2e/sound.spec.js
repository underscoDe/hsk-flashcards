import { expect, test } from '@playwright/test';
import { openSettings, option, rateAllKnown, setOptions, startSession } from './helpers.js';

// A fake audio output and vibration motor: window.played lists the sounds that
// started (file names, e.g. 'known'), window.vibrations the vibration patterns.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.played = [];
    window.vibrations = [];
    navigator.vibrate = pattern => { window.vibrations.push(pattern); return true; };

    const urls = new WeakMap();
    const readBody = Response.prototype.arrayBuffer;
    Response.prototype.arrayBuffer = async function () {
      const data = await readBody.call(this);
      urls.set(data, this.url);
      return data;
    };
    window.AudioContext = class {
      state = 'running';
      destination = {};
      resume() { return Promise.resolve(); }
      decodeAudioData(data) { return Promise.resolve({ name: urls.get(data).match(/(\w+)\.mp3$/)[1] }); }
      createGain() { return { gain: {}, connect: node => node }; }
      createBufferSource() {
        return { connect: node => node, start() { window.played.push(this.buffer.name); } };
      }
    };
  });
  await page.goto('/');
});

const played     = page => page.evaluate(() => window.played);
const vibrations = page => page.evaluate(() => window.vibrations);

/** Waits for the sounds played since the last call to be `names`, in order. */
async function expectSounds(page, names) {
  await expect.poll(() => played(page)).toEqual(names);
  await page.evaluate(() => { window.played = []; });
}

test('a session plays a sound for each step', async ({ page }) => {
  await startSession(page);

  await page.locator('#flashcard').click();
  await expectSounds(page, ['flip']);
  await page.locator('#btn-know').click();
  await expectSounds(page, ['known']);
  await page.locator('#flashcard').click();
  await page.locator('#btn-review').click();
  await expectSounds(page, ['flip', 'unknown']);
  await page.locator('#btn-undo').click();
  await expectSounds(page, ['undo']);

  await rateAllKnown(page, 9);
  await expect(page.locator('#results-screen')).toBeVisible();
  await expectSounds(page, [...Array(9).fill('known'), 'great']);

  expect(await vibrations(page)).toEqual([12, [20, 40, 20], ...Array(9).fill(12), [30, 60, 30, 60, 60]]);
});

test('a session below 70% ends on a quieter sound', async ({ page }) => {
  await startSession(page);
  for (let i = 0; i < 10; i++) await page.keyboard.press('u');
  await expect(page.locator('#results-screen')).toBeVisible();
  await expect.poll(() => played(page)).toContain('finish');
  expect(await played(page)).not.toContain('great');
});

test('typing mode plays the answer check sounds', async ({ page }) => {
  await option(page, 'level', '1').click();
  await setOptions(page, { 'card-mode': 'type-pinyin', order: 'asc', count: '10' });
  await page.locator('#btn-start').click();

  await page.locator('#answer-input').fill('ai4'); // 爱 comes first in A→Z
  await page.locator('#answer-input').press('Enter');
  await expectSounds(page, ['correct']);

  await page.keyboard.press('Enter'); // confirms the suggested ✓ Got it
  await page.locator('#answer-input').fill('xyz');
  await page.locator('#answer-input').press('Enter');
  await expectSounds(page, ['known', 'wrong']);
});

test('a word reaching the mastered box plays its own sound', async ({ page }) => {
  await startSession(page);
  await rateAllKnown(page, 10);
  await page.locator('#btn-new-config').click();

  // Box 3 and due now: the next ✓ moves the words to the mastered box
  await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('hsk-progress'));
    Object.values(progress).forEach(entry => { entry.box = 3; entry.due = 0; });
    localStorage.setItem('hsk-progress', JSON.stringify(progress));
  });
  await page.reload();
  await page.locator('#btn-review-today').click();
  await page.keyboard.press('k');
  await expectSounds(page, ['mastered']);
  expect(await vibrations(page)).toEqual([[15, 30, 15]]);
});

test('the "?" next to Sounds opens its guide topic', async ({ page }) => {
  await openSettings(page);
  await page.locator('#settings-screen .btn-help[data-guide="guide-topic-sound"]').click();
  await expect(page.locator('#guide-topic-sound')).toHaveAttribute('open', '');
});

test('sounds and vibrations can be turned off, and the choice is remembered', async ({ page }) => {
  await openSettings(page);
  await option(page, 'sound', 'off').click();
  await page.reload();
  await openSettings(page);
  await expect(option(page, 'sound', 'off')).toHaveClass(/active/);
  await page.locator('#btn-close-settings').click();

  await startSession(page);
  await rateAllKnown(page, 10);
  await expect(page.locator('#results-screen')).toBeVisible();
  await page.waitForTimeout(400); // past the results sound delay
  expect(await played(page)).toEqual([]);
  expect(await vibrations(page)).toEqual([]);

  // Turning them back on plays a sample
  await page.locator('#btn-new-config').click();
  await openSettings(page);
  await option(page, 'sound', 'on').click();
  await expectSounds(page, ['known']);

  // Reset settings turns them on too
  await option(page, 'sound', 'off').click();
  await page.locator('#btn-reset-settings').click();
  await expect(option(page, 'sound', 'on')).toHaveClass(/active/);
});
