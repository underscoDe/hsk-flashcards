// Spaced repetition (Leitner boxes), persisted in localStorage.
// Each word id maps to { box, due, level }: `due` is the local midnight timestamp
// from which the word should be reviewed again.

const STORAGE_KEY     = 'hsk-progress';
const BOX_DELAYS_DAYS = [0, 1, 2, 4, 8, 16];
const MAX_BOX         = BOX_DELAYS_DAYS.length - 1;
export const MASTERED_BOX = 4;

const progress = loadProgress();

/** Updates a word after it was rated. Returns true if it moved up a box. */
export function recordAnswer(word, isKnown) {
  const prev = progress[word.id];

  if (!isKnown) {
    progress[word.id] = { box: 0, due: dayStart(0), level: word.level };
    saveProgress();
    return false;
  }

  // Knowing a word that isn't due yet keeps its place: no promotion without spacing
  if (prev && !isDue(prev)) return false;

  const box = Math.min((prev?.box ?? 0) + 1, MAX_BOX);
  progress[word.id] = { box, due: dayStart(BOX_DELAYS_DAYS[box]), level: word.level };
  saveProgress();
  return true;
}

/** Ids and levels of words due for review now. */
export function getDueEntries() {
  return Object.entries(progress)
    .filter(([, entry]) => isDue(entry))
    .map(([id, entry]) => ({ id: Number(id), level: entry.level }));
}

/** Days until the next review, or null if no word has been rated yet. */
export function getDaysUntilNextReview() {
  const dues = Object.values(progress).map(entry => entry.due);
  if (!dues.length) return null;
  return Math.max(0, Math.round((Math.min(...dues) - dayStart(0)) / DAY_MS));
}

/** Number of mastered words per level, e.g. { '1': 42, '3': 7 }. */
export function getMasteredByLevel() {
  return Object.values(progress)
    .filter(entry => entry.box >= MASTERED_BOX)
    .reduce((acc, entry) => ({ ...acc, [entry.level]: (acc[entry.level] ?? 0) + 1 }), {});
}

export function hasProgress() {
  return Object.keys(progress).length > 0;
}

export function resetProgress() {
  Object.keys(progress).forEach(id => delete progress[id]);
  saveProgress();
}

// ---- Helpers ----

const DAY_MS = 24 * 60 * 60 * 1000;

function isDue(entry) {
  return entry.due <= Date.now();
}

// Local midnight `days` days from today (Date handles month ends and DST)
function dayStart(days) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

// Storage can be unavailable (private mode, blocked site data): the app then
// works as before, just without saving.
function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn('Could not save progress', err);
  }
}
