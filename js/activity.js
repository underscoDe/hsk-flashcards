import { readStorage, writeStorage } from './utils.js';

// Daily study log for the stats, persisted in localStorage: each local date
// ('2026-10-21') maps to { reviewed, new }, the cards rated that day and how
// many of them were words rated for the first time.

const STORAGE_KEY = 'hsk-activity';

const activity = loadActivity();

/** Counts a rating today; returns the day it was counted on, for undo. */
export function recordActivity(isNewWord) {
  const day = dayKey(0);
  const counts = activity[day] ?? { reviewed: 0, new: 0 };
  activity[day] = { reviewed: counts.reviewed + 1, new: counts.new + (isNewWord ? 1 : 0) };
  saveActivity();
  return day;
}

/** Takes back a rating counted by recordActivity. */
export function removeActivity(day, isNewWord) {
  const counts = activity[day];
  if (!counts) return;

  if (counts.reviewed <= 1) delete activity[day];
  else activity[day] = { reviewed: counts.reviewed - 1, new: Math.max(0, counts.new - (isNewWord ? 1 : 0)) };
  saveActivity();
}

/** The last `count` days, oldest first: { date, reviewed, new }, zeros on days off. */
export function getRecentDays(count) {
  return Array.from({ length: count }, (_, i) => {
    const date = dayKey(i - count + 1);
    return { date, reviewed: 0, new: 0, ...activity[date] };
  });
}

/**
 * Days in a row with at least one card rated. The current streak still counts
 * yesterday's run until today is over, so it doesn't drop to 0 every morning.
 */
export function getStreaks() {
  const studied = new Set(Object.keys(activity).map(dayNumber));
  const today = dayNumber(dayKey(0));

  let current = 0;
  for (let day = studied.has(today) ? today : today - 1; studied.has(day); day--) current++;

  const best = [...studied]
    .sort((a, b) => a - b)
    .reduce(({ best, run, prev }, day) => {
      const nextRun = day === prev + 1 ? run + 1 : 1;
      return { best: Math.max(best, nextRun), run: nextRun, prev: day };
    }, { best: 0, run: 0, prev: -Infinity }).best;

  return { current, best };
}

export function resetActivity() {
  Object.keys(activity).forEach(day => delete activity[day]);
  saveActivity();
}

// ---- Helpers ----

// Local date `offset` days from today, as YYYY-MM-DD
function dayKey(offset) {
  const d = new Date();
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Whole days since 1970 (UTC, so DST changes don't break the counting)
function dayNumber(key) {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000);
}

function loadActivity() {
  const data = readStorage(STORAGE_KEY);
  return data && typeof data === 'object' ? data : {};
}

function saveActivity() {
  writeStorage(STORAGE_KEY, activity);
}
