export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sortWords(words, order) {
  switch (order) {
    case 'asc':  return [...words].sort((a, b) => a.pinyin.localeCompare(b.pinyin, 'zh'));
    case 'desc': return [...words].sort((a, b) => b.pinyin.localeCompare(a.pinyin, 'zh'));
    default:     return shuffle(words);
  }
}

// New format: array of { id, hanzi, pinyin, translations[] }
export function rawToWords(data, level = null) {
  return data.map(entry => ({
    id:          entry.id,     // unique across levels; hanzi alone isn't (了 le/liǎo)
    hanzi:       entry.hanzi,
    pinyin:      entry.pinyin || '',
    translation: cleanTranslations(entry.translations),
    level,
  }));
}

function cleanTranslations(arr) {
  if (!arr || !arr.length) return '—';
  // Filter CC-CEDICT classifier notes (CL:...), "(Tw)" variants, "also written..."
  const clean = arr.filter(t => !/^CL:|^also written|^\(Tw\)/.test(t));
  return (clean.length ? clean : arr).slice(0, 3).join(', ');
}

const TONE_MARKS = {
  1: 'āēīōūǖ',
  2: 'áéíóúǘ',
  3: 'ǎěǐǒǔǚ',
  4: 'àèìòùǜ',
};

/** Tone of a pinyin syllable from its diacritic: 1–4, or 5 for the neutral tone. */
export function getTone(syllable) {
  const chars = [...syllable.toLowerCase()];
  const entry = Object.entries(TONE_MARKS).find(([, marks]) => chars.some(c => marks.includes(c)));
  return entry ? Number(entry[0]) : 5;
}

// Storage can be unavailable (private mode, blocked site data): reads fall back
// to null and failed writes are only logged, so the app keeps working.
export function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Could not save ${key}`, err);
  }
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
