import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// "Today" for every test: 21 Oct 2026, 15:00 local time
const TODAY = new Date(2026, 9, 21, 15, 0);
const midnight = days => new Date(2026, 9, 21 + days).getTime();
const word = (id, level = '1') => ({ id, level });

/** Fresh progress module over a fake localStorage holding `saved`. */
async function loadProgress(saved) {
  const store = new Map();
  if (saved !== undefined) store.set('hsk-progress', typeof saved === 'string' ? saved : JSON.stringify(saved));
  vi.stubGlobal('localStorage', {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  });
  vi.resetModules();
  const progress = await import('../../js/progress.js');
  return { ...progress, stored: () => JSON.parse(store.get('hsk-progress') ?? 'null') };
}

/** Moves the clock `days` days forward. */
function travel(days) {
  vi.setSystemTime(new Date(2026, 9, 21 + days, 15, 0));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('recordAnswer', () => {
  it('puts a new known word in box 1, due tomorrow', async () => {
    const { recordAnswer, getEntry } = await loadProgress();
    expect(recordAnswer(word(1), true)).toBe(true);
    expect(getEntry(1)).toEqual({ box: 1, due: midnight(1), level: '1' });
  });

  it('sends a missed word back to box 0, due today', async () => {
    const { recordAnswer, getEntry } = await loadProgress({ 1: { box: 4, due: midnight(-1), level: '1' } });
    expect(recordAnswer(word(1), false)).toBe(false);
    expect(getEntry(1)).toEqual({ box: 0, due: midnight(0), level: '1' });
  });

  it('follows the 1, 2, 4, 8, 16 days intervals and caps at box 5', async () => {
    const { recordAnswer, getEntry } = await loadProgress();
    const delays = [];
    for (let day = 0, i = 0; i < 7; i++) {
      recordAnswer(word(1), true);
      const { due } = getEntry(1);
      delays.push(Math.round((due - midnight(day)) / 864e5));
      day += delays.at(-1);
      travel(day);
    }
    expect(delays).toEqual([1, 2, 4, 8, 16, 16, 16]);
    expect(getEntry(1).box).toBe(5);
  });

  it('does not promote a word that is not due yet', async () => {
    const entry = { box: 2, due: midnight(3), level: '1' };
    const { recordAnswer, getEntry } = await loadProgress({ 1: entry });
    expect(recordAnswer(word(1), true)).toBe(false);
    expect(getEntry(1)).toEqual(entry);
  });

  it('promotes a word that is due', async () => {
    const { recordAnswer, getEntry } = await loadProgress({ 1: { box: 2, due: midnight(0), level: '1' } });
    expect(recordAnswer(word(1), true)).toBe(true);
    expect(getEntry(1)).toEqual({ box: 3, due: midnight(4), level: '1' });
  });

  it('saves every change to localStorage', async () => {
    const { recordAnswer, stored } = await loadProgress();
    recordAnswer(word(9, '2'), false);
    expect(stored()).toEqual({ 9: { box: 0, due: midnight(0), level: '2' } });
  });
});

describe('reading progress', () => {
  const saved = {
    1: { box: 0, due: midnight(0), level: '1' },  // due today
    2: { box: 4, due: midnight(-2), level: '1' }, // overdue, mastered
    3: { box: 5, due: midnight(3), level: '3' },  // mastered, not due
    4: { box: 1, due: midnight(1), level: '3' },
  };

  it('lists due words with their level', async () => {
    const { getDueEntries } = await loadProgress(saved);
    expect(getDueEntries()).toEqual([{ id: 1, level: '1' }, { id: 2, level: '1' }]);
  });

  it('counts mastered words (box 4+) per level', async () => {
    const { getMasteredByLevel } = await loadProgress(saved);
    expect(getMasteredByLevel()).toEqual({ 1: 1, 3: 1 });
  });

  it('gives the days until the next review', async () => {
    const { getDaysUntilNextReview } = await loadProgress({ 3: saved[3], 4: saved[4] });
    expect(getDaysUntilNextReview()).toBe(1);
  });

  it('reports 0 days when something is already due, null without progress', async () => {
    expect((await loadProgress(saved)).getDaysUntilNextReview()).toBe(0);
    expect((await loadProgress()).getDaysUntilNextReview()).toBeNull();
  });

  it('knows whether any word was rated', async () => {
    expect((await loadProgress()).hasProgress()).toBe(false);
    expect((await loadProgress(saved)).hasProgress()).toBe(true);
  });

  it('starts empty when saved data is corrupted', async () => {
    expect((await loadProgress('{not json')).hasProgress()).toBe(false);
    expect((await loadProgress('"a string"')).hasProgress()).toBe(false);
  });
});

describe('undo support', () => {
  it('getEntry returns a copy, not the live object', async () => {
    const { getEntry, recordAnswer } = await loadProgress({ 1: { box: 2, due: midnight(0), level: '1' } });
    const before = getEntry(1);
    recordAnswer(word(1), true);
    expect(before).toEqual({ box: 2, due: midnight(0), level: '1' });
  });

  it('restoreEntry puts a previous state back, or forgets a new word', async () => {
    const { getEntry, recordAnswer, restoreEntry, stored } = await loadProgress({ 1: { box: 2, due: midnight(0), level: '1' } });
    const before1 = getEntry(1);
    const before2 = getEntry(2);
    recordAnswer(word(1), true);
    recordAnswer(word(2), true);

    restoreEntry(1, before1);
    restoreEntry(2, before2);

    expect(stored()).toEqual({ 1: { box: 2, due: midnight(0), level: '1' } });
  });
});

describe('resetProgress', () => {
  it('forgets every word', async () => {
    const { resetProgress, hasProgress, stored } = await loadProgress({ 1: { box: 2, due: midnight(0), level: '1' } });
    resetProgress();
    expect(hasProgress()).toBe(false);
    expect(stored()).toEqual({});
  });
});
