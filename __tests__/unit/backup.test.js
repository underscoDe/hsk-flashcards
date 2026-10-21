import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const NOW = new Date(2026, 9, 21, 15, 0);

const PROGRESS = {
  12: { box: 2, due: new Date(2026, 9, 23).getTime(), level: '1' },
  40: { box: 4, due: new Date(2026, 9, 29).getTime(), level: '3' },
};
const ACTIVITY = { '2026-10-20': { reviewed: 15, new: 5 }, '2026-10-21': { reviewed: 3, new: 0 } };

/** Fresh modules over a fake localStorage holding `saved` ({ key: value }). */
async function loadModules(saved = {}) {
  const store = new Map(Object.entries(saved).map(([key, value]) => [key, JSON.stringify(value)]));
  vi.stubGlobal('localStorage', {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  });
  vi.resetModules();
  return {
    ...await import('../../js/backup.js'),
    stored: key => JSON.parse(store.get(key) ?? 'null'),
  };
}

/** Backup file text, with `changes` applied over a valid one. */
function backupText(changes = {}) {
  return JSON.stringify({
    app: 'hsk-flashcards', version: 1, exportedAt: NOW.toISOString(),
    progress: PROGRESS, activity: ACTIVITY, ...changes,
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('createBackup', () => {
  it('names the file after today and holds the progress and stats', async () => {
    const { createBackup } = await loadModules({ 'hsk-progress': PROGRESS, 'hsk-activity': ACTIVITY });
    const { name, text } = createBackup();

    expect(name).toBe('hsk-flashcards-backup-2026-10-21.json');
    expect(JSON.parse(text)).toEqual({
      app: 'hsk-flashcards', version: 1, exportedAt: NOW.toISOString(),
      progress: PROGRESS, activity: ACTIVITY,
    });
  });

  it('works with nothing saved yet', async () => {
    const { createBackup } = await loadModules();
    const data = JSON.parse(createBackup().text);
    expect(data.progress).toEqual({});
    expect(data.activity).toEqual({});
  });
});

describe('parseBackup', () => {
  it('reads a backup made by createBackup', async () => {
    const { createBackup, parseBackup } = await loadModules({ 'hsk-progress': PROGRESS, 'hsk-activity': ACTIVITY });
    const backup = parseBackup(createBackup().text);

    expect(backup.progress).toEqual(PROGRESS);
    expect(backup.activity).toEqual(ACTIVITY);
    expect(backup.wordCount).toBe(2);
    expect(backup.exportedAt).toEqual(NOW);
  });

  it('accepts a backup without a valid export date', async () => {
    const { parseBackup } = await loadModules();
    expect(parseBackup(backupText({ exportedAt: 'yesterday' })).exportedAt).toBeNull();
  });

  it.each([
    ['text that is not JSON', 'not json'],
    ['JSON null', 'null'],
    ['another app’s file', backupText({ app: 'other-app' })],
    ['an unknown version', backupText({ version: 2 })],
    ['missing progress', backupText({ progress: undefined })],
    ['progress as a list', backupText({ progress: [] })],
    ['missing stats', backupText({ activity: null })],
  ])('rejects %s', async (_, text) => {
    const { parseBackup } = await loadModules();
    expect(parseBackup(text)).toBeNull();
  });
});

describe('restoreBackup', () => {
  it('replaces the saved progress and stats', async () => {
    const { parseBackup, restoreBackup, stored } = await loadModules({
      'hsk-progress': { 99: { box: 1, due: 0, level: '6' } },
      'hsk-activity': { '2026-10-01': { reviewed: 1, new: 1 } },
    });
    restoreBackup(parseBackup(backupText()));

    expect(stored('hsk-progress')).toEqual(PROGRESS);
    expect(stored('hsk-activity')).toEqual(ACTIVITY);
  });

  it('skips the entries that don’t look right', async () => {
    const { parseBackup, restoreBackup, stored } = await loadModules();
    restoreBackup(parseBackup(backupText({
      progress: {
        ...PROGRESS,
        abc: { box: 1, due: 0, level: '1' },     // id is not a number
        7:   { box: 9, due: 0, level: '1' },     // no such box
        8:   { box: 1, due: 'soon', level: '1' },
        9:   { box: 1, due: 0, level: 2 },
        10:  null,
      },
      activity: {
        ...ACTIVITY,
        'Oct 2':      { reviewed: 1, new: 0 },
        '2026-10-03': { reviewed: 0, new: 0 },
        '2026-10-04': { reviewed: 2, new: 3 },
        '2026-10-05': 'lots',
      },
    })));

    expect(stored('hsk-progress')).toEqual(PROGRESS);
    expect(stored('hsk-activity')).toEqual(ACTIVITY);
  });

  it('drops extra fields from the entries', async () => {
    const { parseBackup, restoreBackup, stored } = await loadModules();
    restoreBackup(parseBackup(backupText({
      progress: { 5: { box: 1, due: 0, level: '2', note: 'x' } },
      activity: { '2026-10-20': { reviewed: 2, new: 1, extra: true } },
    })));

    expect(stored('hsk-progress')).toEqual({ 5: { box: 1, due: 0, level: '2' } });
    expect(stored('hsk-activity')).toEqual({ '2026-10-20': { reviewed: 2, new: 1 } });
  });
});
