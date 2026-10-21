import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FRENCH_FIXES, findMeanings, numberedPinyin, parseCfdict } from '../../scripts/update-french.mjs';

const CFDICT = [
  '# CFDICT header',
  '愛 爱 [ai4] /amour/aimer/',
  '關係 关系 [guan1 xi5] /relation/rapport/',
  '女兒 女儿 [nu:3 er2] /fille (parenté)/',
  '飛機 飞机 [fei1 ji1] /avion/(argot) branlette/',
  '日 日 [ri4] /jour/(72e radical)/',
  '一 一 [yi1] /un/(radical 1)/radical chimique/',
  '好 好 [hao3] /bien/bon/',
  '好 好 [hao4] /aimer/',
  '還 还 [hai2] /encore/',
  '還 还 [hai2] /encore/plutôt/',
].join('\r\n');

describe('numberedPinyin', () => {
  it.each([
    ['ài', 'ai4'],
    ['bà ba', 'ba4 ba5'],
    ['nǚ ér', 'nu:3 er2'],
    ['lvè', 'lu:e4'],
    ['Běi jīng', 'bei3 jing1'],
  ])('%s → %s', (pinyin, expected) => {
    expect(numberedPinyin(pinyin)).toBe(expected);
  });
});

describe('findMeanings', () => {
  const entries = parseCfdict(CFDICT);
  const meanings = (hanzi, pinyin) => findMeanings(entries, { hanzi, pinyin });

  it('picks the entry with the same reading', () => {
    expect(meanings('爱', 'ài')).toEqual(['amour', 'aimer']);
    expect(meanings('好', 'hǎo')).toEqual(['bien', 'bon']);
    expect(meanings('女儿', 'nǚ ér')).toEqual(['fille (parenté)']);
  });

  it('accepts a neutral tone written differently', () => {
    expect(meanings('关系', 'guān xì')).toEqual(['relation', 'rapport']);
  });

  it('merges entries of the same word, without duplicates', () => {
    expect(meanings('还', 'hái')).toEqual(['encore', 'plutôt']);
  });

  it('drops slang senses and radical numbers, not real meanings', () => {
    expect(meanings('飞机', 'fēi jī')).toEqual(['avion']);
    expect(meanings('日', 'rì')).toEqual(['jour']);
    expect(meanings('一', 'yī')).toEqual(['un', 'radical chimique']);
  });

  it('finds nothing for a missing word or another reading', () => {
    expect(meanings('岁', 'suì')).toEqual([]);
    expect(meanings('好', 'hāo')).toEqual([]);
  });

  it('has hand-written fixes made of meanings', () => {
    Object.values(FRENCH_FIXES).forEach(fix => {
      expect(fix.length).toBeGreaterThan(0);
      fix.forEach(meaning => expect(meaning.trim()).not.toBe(''));
    });
  });
});

describe('French data', () => {
  const read = path => JSON.parse(readFileSync(new URL(`../../data/${path}`, import.meta.url), 'utf8'));

  it.each([1, 2, 3, 4, 5, 6])('has French meanings for every HSK %i word', level => {
    const french = read(`fr/hsk-level-${level}.json`);
    const missing = read(`hsk-level-${level}.json`).filter(word => !french[word.id]?.length);
    expect(missing.map(word => word.hanzi)).toEqual([]);
  });
});
