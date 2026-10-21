import { exportProgress, importProgress } from './progress.js';
import { exportActivity, importActivity } from './activity.js';

// Progress and stats only live in this browser: a backup file moves them to
// another device or browser, or keeps them safe before clearing the site's data.

const APP_ID  = 'hsk-flashcards';
const VERSION = 1;

/** The backup file's name and contents. */
export function createBackup(now = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const contents = {
    app: APP_ID,
    version: VERSION,
    exportedAt: now.toISOString(),
    progress: exportProgress(),
    activity: exportActivity(),
  };
  return { name: `hsk-flashcards-backup-${date}.json`, text: JSON.stringify(contents, null, 2) };
}

/** Reads a backup file's text; null when it isn't a backup of this app. */
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (data?.app !== APP_ID || data.version !== VERSION) return null;
  if (!isObject(data.progress) || !isObject(data.activity)) return null;

  return {
    progress:   data.progress,
    activity:   data.activity,
    wordCount:  Object.keys(data.progress).length,
    exportedAt: Number.isNaN(Date.parse(data.exportedAt)) ? null : new Date(data.exportedAt),
  };
}

/** Replaces this device's progress and stats with a parsed backup's. */
export function restoreBackup(backup) {
  importProgress(backup.progress);
  importActivity(backup.activity);
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
