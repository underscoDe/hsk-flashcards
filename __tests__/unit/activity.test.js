import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// "Today" for every test: 21 Oct 2026, 15:00 local time
const TODAY = new Date(2026, 9, 21, 15, 0);

/** Fresh activity module over a fake localStorage holding `saved`. */
async function loadActivity(saved) {
  const store = new Map();
  if (saved !== undefined) store.set('hsk-activity', typeof saved === 'string' ? saved : JSON.stringify(saved));
  vi.stubGlobal('localStorage', {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  });
  vi.resetModules();
  const activity = await import('../../js/activity.js');
  return { ...activity, stored: () => JSON.parse(store.get('hsk-activity') ?? 'null') };
}

/** Activity on the days `offsets` from today (e.g. -1 = yesterday), one card each. */
function daysStudied(...offsets) {
  return Object.fromEntries(offsets.map(offset => {
    const d = new Date(2026, 9, 21 + offset);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return [key, { reviewed: 1, new: 0 }];
  }));
}

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

describe('recordActivity / removeActivity', () => {
  it('counts the cards rated today, and the new words among them', async () => {
    const { recordActivity, stored } = await loadActivity();
    expect(recordActivity(true)).toBe('2026-10-21');
    recordActivity(false);
    expect(stored()).toEqual({ '2026-10-21': { reviewed: 2, new: 1 } });
  });

  it('takes a rating back on the day it was counted, even later', async () => {
    const { recordActivity, removeActivity, stored } = await loadActivity();
    const day = recordActivity(true);
    recordActivity(true);
    travel(1);
    removeActivity(day, true);
    expect(stored()).toEqual({ '2026-10-21': { reviewed: 1, new: 1 } });
    removeActivity(day, true);
    expect(stored()).toEqual({});
    removeActivity(day, true); // nothing left: no-op
    expect(stored()).toEqual({});
  });

  it('starts empty with missing or broken data', async () => {
    expect((await loadActivity('not json')).getRecentDays(1)[0].reviewed).toBe(0);
  });
});

describe('getRecentDays', () => {
  it('lists the last days oldest first, with zeros on days off', async () => {
    const { getRecentDays } = await loadActivity({ '2026-10-20': { reviewed: 5, new: 2 } });
    expect(getRecentDays(3)).toEqual([
      { date: '2026-10-19', reviewed: 0, new: 0 },
      { date: '2026-10-20', reviewed: 5, new: 2 },
      { date: '2026-10-21', reviewed: 0, new: 0 },
    ]);
  });

  it('crosses month ends', async () => {
    travel(11); // 1 Nov
    const { getRecentDays } = await loadActivity();
    expect(getRecentDays(2).map(day => day.date)).toEqual(['2026-10-31', '2026-11-01']);
  });
});

describe('getStreaks', () => {
  it('is 0 without activity', async () => {
    const { getStreaks } = await loadActivity();
    expect(getStreaks()).toEqual({ current: 0, best: 0 });
  });

  it('counts the days in a row up to today', async () => {
    const { getStreaks } = await loadActivity(daysStudied(-2, -1, 0));
    expect(getStreaks()).toEqual({ current: 3, best: 3 });
  });

  it('keeps yesterday’s streak alive until today is over', async () => {
    const { getStreaks } = await loadActivity(daysStudied(-2, -1));
    expect(getStreaks().current).toBe(2);
    travel(1);
    expect(getStreaks().current).toBe(0);
  });

  it('remembers the best streak after a break', async () => {
    const { getStreaks } = await loadActivity(daysStudied(-10, -9, -8, -7, -3, 0));
    expect(getStreaks()).toEqual({ current: 1, best: 4 });
  });

  it('counts across a daylight saving change (25 Oct 2026 in Europe)', async () => {
    travel(6); // 27 Oct
    const { getStreaks } = await loadActivity(daysStudied(3, 4, 5, 6));
    expect(getStreaks().current).toBe(4);
  });
});

describe('resetActivity', () => {
  it('clears everything', async () => {
    const { resetActivity, getStreaks, stored } = await loadActivity(daysStudied(0));
    resetActivity();
    expect(stored()).toEqual({});
    expect(getStreaks().current).toBe(0);
  });
});
