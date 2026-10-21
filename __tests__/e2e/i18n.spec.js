import { expect, test } from '@playwright/test';
import { openGuide, openSettings, option, quitSession, rateAllKnown, startSession } from './helpers.js';

test.describe('on a French device', () => {
  test.use({ locale: 'fr-FR' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('the app is in French', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('html')).not.toHaveClass(/i18n-pending/);
    await expect(page.locator('#btn-start')).toHaveText('Commencer');
    await expect(page.locator('#btn-open-settings')).toHaveAttribute('aria-label', 'Réglages');
    await expect(option(page, 'level', '6').locator('.level-count')).toHaveText('2 500 mots');
    await expect(page.locator('#options-summary')).toHaveText('Hanzi → Pinyin · Aléatoire · 25 mots');
  });

  test('a session and its results are in French', async ({ page }) => {
    await startSession(page); // A→Z: 爱 ài comes first
    await expect(page.locator('#translation-back')).toHaveText('amour, aimer, affection');
    await expect(page.locator('#btn-next')).toHaveText('Suivant →');
    await page.locator('#flashcard').click();
    await expect(page.locator('#btn-know')).toHaveText('✓ Je sais');

    await rateAllKnown(page, 10);
    await expect(page.locator('#r-title')).toHaveText('Parfait, excellent travail !');
    await expect(page.locator('#r-sub')).toHaveText('10 mots révisés — HSK 1');

    await page.locator('#btn-new-config').click();
    await expect(page.locator('#review-text')).toHaveText('✓ Tout est à jour — prochaine révision demain');
    await expect(page.locator('#btn-open-stats')).toHaveText('🔥 Série de 1 jour · Stats ›');
  });

  test('the guide is in French, searchable, and the "?" buttons still find their topic', async ({ page }) => {
    await openGuide(page);
    await expect(page.locator('#guide-start .guide-section-title')).toHaveText('Pour commencer');

    await page.locator('#guide-search').fill('hors ligne');
    await expect(page.locator('#guide-status')).toHaveText(/sujets? trouvés?/);
    await expect(page.locator('.guide-item:not([hidden])').filter({ hasText: 'Utiliser l’app hors ligne' })).toBeVisible();
    await expect(page.locator('.guide-item:not([hidden]) mark').first()).toBeVisible();

    await page.goBack();
    await openSettings(page);
    await page.locator('#settings-screen .btn-help[data-guide="guide-topic-language"]').click();
    await expect(page.locator('#guide-topic-language')).toHaveAttribute('open', '');
    await expect(page.locator('#guide-topic-language summary')).toHaveText('Langue de l’app');
  });
});

test('the language can be changed in the settings, and the choice is remembered', async ({ page }) => {
  await page.goto('/');
  await openSettings(page);
  await expect(option(page, 'language', 'auto')).toHaveClass(/active/);

  await option(page, 'language', 'fr').click();
  await expect(page.locator('#settings-screen .page-title')).toHaveText('Réglages');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await page.goBack();
  await expect(page.locator('#btn-start')).toHaveText('Commencer');
  await expect(page.locator('#options-summary')).toHaveText('Hanzi → Pinyin · Aléatoire · 25 mots');
  await openGuide(page);
  await expect(page.locator('#guide-start .guide-section-title')).toHaveText('Pour commencer');
  await page.goBack();

  await page.reload();
  await expect(page.locator('#btn-start')).toHaveText('Commencer');

  // Meanings follow the language too (A→Z: 爱 ài comes first)
  await startSession(page);
  await expect(page.locator('#translation-back')).toHaveText('amour, aimer, affection');
  await quitSession(page);
  await openSettings(page);
  await option(page, 'language', 'en').click();
  await page.goBack();
  await startSession(page);
  await expect(page.locator('#translation-back')).toHaveText('to love, affection, to be fond of');
  await quitSession(page);

  // Back to English, then reset settings goes back to the device language
  await openSettings(page);
  await option(page, 'language', 'en').click();
  await expect(page.locator('#settings-screen .page-title')).toHaveText('Settings');
  await option(page, 'language', 'fr').click();
  await page.locator('#btn-reset-settings').click();
  await expect(option(page, 'language', 'auto')).toHaveClass(/active/);
  await expect(page.locator('#settings-screen .page-title')).toHaveText('Settings');
});
