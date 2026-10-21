import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EN } from '../../js/locales/en.js';
import { FR } from '../../js/locales/fr.js';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

/** Fresh i18n module for a device in `languages`, with `saved` as the saved choice. */
async function loadI18n({ languages = ['en-US'], saved } = {}) {
  const store = new Map(saved ? [['hsk-language', JSON.stringify(saved)]] : []);
  vi.stubGlobal('localStorage', {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  });
  vi.stubGlobal('navigator', { languages });
  vi.resetModules();
  return import('../../js/i18n.js');
}

afterEach(() => vi.unstubAllGlobals());

describe('language choice', () => {
  it.each([
    [['fr-FR', 'en-US'], 'fr'],
    [['en-GB', 'fr-FR'], 'en'],
    [['de-DE', 'fr-CA'], 'fr'], // the first language the app speaks
    [['zh-CN'], 'en'],
  ])('follows a device in %j: %s', async (languages, expected) => {
    const { getLanguage, getLanguagePreference } = await loadI18n({ languages });
    expect(getLanguagePreference()).toBe('auto');
    expect(getLanguage()).toBe(expected);
  });

  it('keeps a saved choice over the device', async () => {
    const { getLanguage } = await loadI18n({ languages: ['fr-FR'], saved: 'en' });
    expect(getLanguage()).toBe('en');
  });

  it('ignores a saved value it doesn’t know', async () => {
    const { getLanguagePreference } = await loadI18n({ saved: 'klingon' });
    expect(getLanguagePreference()).toBe('auto');
  });
});

describe('t', () => {
  it('fills the placeholders and picks the plural form', async () => {
    const { t } = await loadI18n();
    expect(t('common.words', { count: 1 })).toBe('1 word');
    expect(t('common.words', { count: 2500 })).toBe('2,500 words');
    expect(t('summary.range', { from: 26, to: 50 })).toBe('Words 26–50');
  });

  it('uses French plural rules, where 0 and 1 are singular', async () => {
    const { t } = await loadI18n({ languages: ['fr-FR'] });
    expect(t('common.words', { count: 0 })).toBe('0 mot');
    expect(t('common.words', { count: 1 })).toBe('1 mot');
    expect(t('common.words', { count: 1300 })).toBe('1 300 mots');
  });

  it('falls back to English, then to the key itself', async () => {
    const { t } = await loadI18n({ languages: ['fr-FR'] });
    expect(t('nav.home')).toBe('Accueil');
    expect(t('no.such.key')).toBe('no.such.key');
  });

  it('formats dates in the current language', async () => {
    const { formatDate } = await loadI18n({ languages: ['fr-FR'] });
    expect(formatDate(new Date(2026, 9, 21))).toBe('21 oct.');
  });
});

describe('translations', () => {
  const htmlKeys = [...html.matchAll(/data-i18n(?:-aria-label|-placeholder)?="([^"]+)"/g)].map(m => m[1]);
  const englishKeys = new Set([...htmlKeys, ...Object.keys(EN)]);
  const placeholders = text => [...new Set([...JSON.stringify(text).matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort();

  it('has every text in French, and no French text left over', () => {
    expect(Object.keys(FR).filter(key => !englishKeys.has(key))).toEqual([]);
    expect([...englishKeys].filter(key => !(key in FR))).toEqual([]);
  });

  it('keeps the same placeholders and plural forms in both languages', () => {
    Object.entries(EN).forEach(([key, text]) => {
      expect(placeholders(FR[key]), key).toEqual(placeholders(text));
      if (typeof text === 'object') expect(Object.keys(FR[key]), key).toEqual(expect.arrayContaining(['one', 'other']));
    });
  });

  it('has the same guide topics in both languages, and every "?" button finds its topic', () => {
    const template = lang => html.match(new RegExp(`<template id="guide-${lang}">([\\s\\S]*?)</template>`))[1];
    const ids = lang => [...template(lang).matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    expect(ids('fr')).toEqual(ids('en'));

    const targets = [...html.matchAll(/data-guide="([^"]+)"/g)].map(m => m[1]);
    expect(targets.filter(id => !ids('en').includes(id))).toEqual([]);
  });
});
