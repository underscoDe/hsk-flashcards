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

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
