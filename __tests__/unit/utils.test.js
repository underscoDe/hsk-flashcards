import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTone, rawToWords, readStorage, shuffle, sortWords, writeStorage } from '../../js/utils.js';

describe('shuffle', () => {
  it('keeps the same elements without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = shuffle(input);
    expect(result).not.toBe(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...result].sort()).toEqual(input);
  });
});

describe('sortWords', () => {
  const words = [{ pinyin: 'chá' }, { pinyin: 'ài' }, { pinyin: 'bā' }];

  it('sorts by pinyin A→Z and Z→A', () => {
    expect(sortWords(words, 'asc').map(w => w.pinyin)).toEqual(['ài', 'bā', 'chá']);
    expect(sortWords(words, 'desc').map(w => w.pinyin)).toEqual(['chá', 'bā', 'ài']);
  });

  it('shuffles in random order, keeping every word', () => {
    expect(sortWords(words, 'random')).toHaveLength(3);
    expect(sortWords(words, 'random')).toEqual(expect.arrayContaining(words));
  });
});

describe('getTone', () => {
  it.each([
    ['bā', 1], ['chá', 2], ['nǐ', 3], ['ài', 4], ['ba', 5],
    ['Běi', 3], ['Zhōng', 1], ['lǜ', 4], ['nǚ', 3], ['qi', 5],
  ])('%s → tone %i', (syllable, tone) => {
    expect(getTone(syllable)).toBe(tone);
  });
});

describe('rawToWords', () => {
  const raw = (translations, extra = {}) => [{ id: 7, hanzi: '茶', pinyin: 'chá', translations, ...extra }];

  it('maps id, hanzi, pinyin and level', () => {
    expect(rawToWords(raw(['tea']), '1')[0]).toEqual({ id: 7, hanzi: '茶', pinyin: 'chá', translation: 'tea', level: '1' });
  });

  it('keeps at most three meanings', () => {
    expect(rawToWords(raw(['a', 'b', 'c', 'd']))[0].translation).toBe('a, b, c');
  });

  it('shows a dash when there is no translation', () => {
    expect(rawToWords(raw([]))[0].translation).toBe('—');
  });

  it.each([
    ['classifier fragments', ['tea', 'CL:杯', '壺|壶[hú]'], 'tea'],
    ['bare classifier after a split', ['(informal) father', 'CL:個|个', '位[wèi]'], '(informal) father'],
    ['trailing classifier note', ['hope CL:個|个[gè]'], 'hope'],
    ['cross-references', ['variant of 為|为', 'see 磅秤 scale', 'because of'], 'because of'],
    ['Taiwan pronunciation', ['ton', 'Taiwan pr. [dùn]'], 'ton'],
    ['empty Taiwan note', ['considerably (Taiwan pr. )'], 'considerably'],
    ['traditional|simplified form', ['abbr. for 物種|物种'], 'abbr. for 物种'],
    ['pronunciation note', ['who', 'also pr. [shuí]'], 'who, also pr. shuí'],
  ])('cleans %s', (_, translations, expected) => {
    expect(rawToWords(raw(translations))[0].translation).toBe(expected);
  });

  it('falls back to the cleaned original when every entry is a reference', () => {
    expect(rawToWords(raw(['variant of 胡同[hú tòng]']))[0].translation).toBe('variant of 胡同 (hú tòng)');
  });

  it('uses the hand-written fix for words whose source only holds a reference', () => {
    const [word] = rawToWords([{ id: 32, hanzi: '个', pinyin: 'gè', translations: ['variant of 個|个[gè]'] }]);
    expect(word.translation).toMatch(/^classifier for people/);
  });
});

// Regression net over the real vocabulary: no dictionary notation may reach a card
describe('vocabulary data', () => {
  const words = [1, 2, 3, 4, 5, 6].flatMap(level =>
    rawToWords(JSON.parse(readFileSync(new URL(`../../data/hsk-level-${level}.json`, import.meta.url))), String(level))
  );

  it('has the 5,000 HSK words with unique ids', () => {
    expect(words).toHaveLength(5000);
    expect(new Set(words.map(w => w.id)).size).toBe(5000);
  });

  it('has one pinyin syllable per character (needed for tone colors)', () => {
    const mismatched = words.filter(w => w.pinyin.split(' ').length !== [...w.hanzi].length);
    expect(mismatched).toEqual([]);
  });

  it('shows no raw CC-CEDICT notation and no empty translation', () => {
    const dirty = words.filter(w => !w.translation.trim() || /\[|\]|\||CL:|pr\.\s*\)/.test(w.translation));
    expect(dirty.map(w => `${w.hanzi}: ${w.translation}`)).toEqual([]);
  });
});

describe('readStorage / writeStorage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('round-trips JSON values', () => {
    const store = new Map();
    vi.stubGlobal('localStorage', { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) });
    writeStorage('key', { a: 1 });
    expect(readStorage('key')).toEqual({ a: 1 });
    expect(readStorage('missing')).toBeNull();
  });

  it('returns null for corrupted data', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{not json' });
    expect(readStorage('key')).toBeNull();
  });

  it('never throws when storage is unavailable', () => {
    const throwing = () => { throw new Error('SecurityError'); };
    vi.stubGlobal('localStorage', { getItem: throwing, setItem: throwing });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readStorage('key')).toBeNull();
    expect(() => writeStorage('key', 1)).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
