import { expect, test } from '@playwright/test';
import { option, setOptions, startSession } from './helpers.js';

test('tones color the pinyin and the back of the card, not the front', async ({ page }) => {
  await page.goto('/');
  await startSession(page, { count: 'all' });
  while ((await page.locator('#hanzi-front').textContent()) !== '北京') await page.locator('#btn-next').click();

  await expect(page.locator('#hanzi-front span')).toHaveCount(0);
  const toneClasses = locator => locator.locator('span').evaluateAll(spans => spans.map(s => s.className));
  expect(await toneClasses(page.locator('#hanzi-back'))).toEqual(['tone-3', 'tone-1']);
  expect(await toneClasses(page.locator('#pinyin-back'))).toEqual(['tone-3', 'tone-1']);
  await expect(page.locator('#pinyin-back')).toHaveText('Běi jīng');
});

test('pinyin-first mode shows pinyin and meaning on the front', async ({ page }) => {
  await page.goto('/');
  await setOptions(page, { 'card-mode': 'pinyin-first' });
  await startSession(page);
  await expect(page.locator('#pinyin-front')).toBeVisible();
  await expect(page.locator('#translation-front')).toBeVisible();
  await expect(page.locator('#hanzi-front')).toBeHidden();
});

test('the listen button stays hidden without a Chinese voice', async ({ page }) => {
  await page.addInitScript(() => {
    speechSynthesis.getVoices = () => [{ lang: 'en-US', name: 'English' }];
  });
  await page.goto('/');
  await startSession(page);
  await expect(page.locator('.card-front-face .btn-listen')).toBeHidden();
});

test('the listen button speaks the word in Chinese without flipping the card', async ({ page }) => {
  // Fake a zh-CN voice and record what would be spoken
  await page.addInitScript(() => {
    window.__spoken = [];
    speechSynthesis.getVoices = () => [{ lang: 'zh-CN', name: 'Test voice' }];
    speechSynthesis.speak = utterance => window.__spoken.push({ text: utterance.text, lang: utterance.lang });
    speechSynthesis.cancel = () => {};
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  });
  await page.goto('/');
  await startSession(page);

  await page.locator('.card-front-face .btn-listen').click();
  await expect(page.locator('#flashcard')).not.toHaveClass(/flipped/);
  await page.keyboard.press('p'); // the focused listen button must not swallow shortcuts
  await page.keyboard.press(' ');  // …but Space presses the button instead of flipping
  await expect(page.locator('#flashcard')).not.toHaveClass(/flipped/);

  expect(await page.evaluate(() => window.__spoken)).toEqual([
    { text: '爱', lang: 'zh-CN' },
    { text: '爱', lang: 'zh-CN' },
    { text: '爱', lang: 'zh-CN' },
  ]);

  await page.keyboard.press('k'); // still reaches the rating shortcut
  await expect(page.locator('#fc-current')).toHaveText('2');
});

test('a loading error shows the message dialog', async ({ page }) => {
  await page.goto('/');
  await page.route('**/data/*.json', route => route.abort());
  await option(page, 'level', '5').click();
  await page.locator('#btn-start').click();

  await expect(page.locator('#message-dialog')).toHaveClass(/visible/);
  await expect(page.locator('#message-dialog-title')).toHaveText('Couldn’t load the words');
  await page.locator('#message-dialog-ok').click();
  await expect(page.locator('#message-dialog')).not.toHaveClass(/visible/);
  await expect(page.locator('#setup-screen')).toBeVisible();
});
