import { readStorage, writeStorage } from './utils.js';
import { EN } from './locales/en.js';
import { FR } from './locales/fr.js';

// Interface language: 'auto' (default) follows the device, 'en' / 'fr' override it.
// The English texts of the page are index.html itself: elements marked with
// data-i18n (text), data-i18n-aria-label or data-i18n-placeholder are read once
// at startup, so locales/en.js only holds the texts written by the scripts.
// The inline script in index.html picks the language the same way before first paint.

const LANGUAGE_KEY = 'hsk-language';
const LANGUAGES    = ['en', 'fr'];
const ATTRIBUTES   = ['aria-label', 'placeholder'];

const messages = { en: { ...EN }, fr: FR };

export function initI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    messages.en[el.dataset.i18n] ??= el.textContent.trim().replace(/\s+/g, ' ');
  });
  ATTRIBUTES.forEach(attr => {
    document.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => {
      messages.en[el.getAttribute(`data-i18n-${attr}`)] ??= el.getAttribute(attr);
    });
  });
  translatePage();
  document.documentElement.classList.remove('i18n-pending');
}

export function getLanguagePreference() {
  const saved = readStorage(LANGUAGE_KEY);
  return LANGUAGES.includes(saved) ? saved : 'auto';
}

export function setLanguagePreference(preference) {
  writeStorage(LANGUAGE_KEY, preference);
  translatePage();
  document.dispatchEvent(new CustomEvent('hsk:language-change'));
}

/** The language in use: the saved choice, or the first one of the device the app speaks. */
export function getLanguage() {
  const preference = getLanguagePreference();
  if (preference !== 'auto') return preference;
  const device = navigator.languages.map(tag => tag.slice(0, 2).toLowerCase());
  return device.find(lang => LANGUAGES.includes(lang)) ?? 'en';
}

/**
 * Text for `key` in the current language, with {name} placeholders filled from `params`.
 * A text can have plural forms ({ one, other }), picked with `params.count`.
 */
export function t(key, params = {}) {
  const lang  = getLanguage();
  const entry = messages[lang][key] ?? messages.en[key] ?? key;
  const text  = typeof entry === 'string' ? entry : entry[new Intl.PluralRules(lang).select(params.count)] ?? entry.other;
  return text.replace(/\{(\w+)\}/g, (_, name) => formatParam(params[name], lang));
}

/** Short date in the current language, e.g. 'Oct 21' or '21 oct.'. */
export function formatDate(date, options = { month: 'short', day: 'numeric' }) {
  return date.toLocaleDateString(getLanguage(), options);
}

function translatePage() {
  document.documentElement.lang = getLanguage();
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  ATTRIBUTES.forEach(attr => {
    document.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => {
      el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`)));
    });
  });
}

function formatParam(value, lang) {
  return typeof value === 'number' ? value.toLocaleString(lang) : String(value ?? '');
}
