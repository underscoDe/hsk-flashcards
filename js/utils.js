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
    translation: TRANSLATION_FIXES[entry.id] ?? cleanTranslations(entry.translations),
    level,
  }));
}

function cleanTranslations(arr) {
  if (!arr || !arr.length) return '—';
  const clean = arr.filter(t => !NOT_A_TRANSLATION.test(t));
  return (clean.length ? clean : arr).slice(0, 3).map(simplifyReferences).join(', ');
}

// CC-CEDICT notation → plain text: drops a trailing classifier note, keeps the
// simplified form, puts the pinyin in parentheses (個|个[gè] → 个 (gè)) and
// unbrackets pronunciation notes (also pr. [shuí] → also pr. shuí)
function simplifyReferences(text) {
  return text
    .replace(/\s*CL:.*$/, '')
    .replace(/\s*\(Taiwan pr\.\s*\)/, '') // empty in the source data
    .replace(/[\u3400-\u9fff]+\|([\u3400-\u9fff]+)/g, '$1')
    .replace(/([\u3400-\u9fff]+)\[([^\]]+)\]/g, '$1 ($2)')
    .replace(/\[([^\]]+)\]/g, '$1');
}

// CC-CEDICT entries that aren't meanings: classifier notes (the source split
// "CL:個|个[gè],位[wèi]" on commas, hence bare 位[wèi] items), Taiwan-only
// forms (HSK follows mainland usage) and cross-references ("also written…",
// "variant of…", "see…")
const NOT_A_TRANSLATION =
  /^CL:|^also written|^\(Tw\)|^Taiwan pr|^(old )?variant of |^see (also )?|^[\u3400-\u9fff|]+(\[[^\]]+\])?$/;

// Words whose source entry only holds a cross-reference ("variant of…"), by id
const TRANSLATION_FIXES = {
  32:   'classifier for people and objects in general, individual',      // 个
  140:  'how?, what?, why?',                                              // 怎么
  387:  'relation, relationship, connection',                             // 关系
  1614: 'lane, alley',                                                    // 胡同
  2047: 'to rise, to go up, to promote, liter',                           // 升
  2640: 'unique, unconventional, novel',                                  // 别致
  3709: 'long-winded, wordy, troublesome',                                // 啰唆
  3753: 'to fill the air, to spread everywhere, to pervade',              // 弥漫
  4257: 'to pull out, to fish out (from a pocket), to dig',               // 掏
  4897: 'as everyone knows, as is well known',                            // 众所周知
};

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

// Each tone-marked vowel → its plain letter, with ü written v as on pinyin keyboards
const PLAIN_VOWELS = Object.fromEntries(
  Object.values(TONE_MARKS).flatMap(marks => [...marks].map((mark, i) => [mark, 'aeiouv'[i]]))
);

function stripTones(text) {
  return [...text].map(c => PLAIN_VOWELS[c] ?? c).join('');
}

/**
 * Checks a typed pinyin answer against the expected pinyin, tones included.
 * Accepts tone marks (nǐ hǎo) or numbers (ni3 hao3, 0 or 5 or nothing for the neutral
 * tone), with or without spaces, and ü as ü, v or u:.
 * Returns 'correct', 'tones' (right syllables, wrong tones) or 'wrong'.
 */
export function checkPinyin(answer, pinyin) {
  let rest = answer.normalize('NFC').toLowerCase().replace(/u:|ü/g, 'v').replace(/[\s'’-]/g, '');
  let hasRightTones = true;

  // The expected syllables tell where each typed syllable ends
  for (const syllable of pinyin.toLowerCase().split(' ')) {
    const letters = stripTones(syllable);
    const typed   = rest.slice(0, letters.length);
    if (stripTones(typed) !== letters) return 'wrong';

    const digit = rest[letters.length]?.match(/[0-5]/)?.[0];
    const tone  = digit ? Number(digit) || 5 : getTone(typed);
    if (tone !== getTone(syllable)) hasRightTones = false;
    rest = rest.slice(letters.length + (digit ? 1 : 0));
  }

  if (rest) return 'wrong';
  return hasRightTones ? 'correct' : 'tones';
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
