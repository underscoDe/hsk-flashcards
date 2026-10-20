import { session, cfg } from './state.js';
import { recordAnswer } from './progress.js';
import { getTone } from './utils.js';
import { initSpeech, speak } from './speech.js';

export function renderCard() {
  const word = session.words[session.currentIndex];
  const idx  = session.currentIndex;
  const tot  = session.words.length;

  document.getElementById('fc-current').textContent = idx + 1;
  document.getElementById('fc-total').textContent   = tot;
  document.getElementById('progress-fill').style.width = `${(idx / tot) * 100}%`;

  // One pinyin syllable per character (checked on all 5,000 words)
  const syllables = word.pinyin.split(' ');
  const tones     = syllables.map(getTone);

  // Front hanzi stays uncolored so the tones aren't given away before flipping
  document.getElementById('hanzi-front').textContent = word.hanzi;
  renderWithTones(document.getElementById('hanzi-back'),   [...word.hanzi], tones, '');
  renderWithTones(document.getElementById('pinyin-front'), syllables, tones, ' ');
  renderWithTones(document.getElementById('pinyin-back'),  syllables, tones, ' ');
  document.getElementById('translation-front').textContent = word.translation;
  document.getElementById('translation-back').textContent  = word.translation;

  document.getElementById('flashcard').classList.toggle(
    'mode-pinyin-first', cfg.cardMode === 'pinyin-first'
  );

  updateStatusBadge(word.id);
  updateLevelBadge(session.showsLevel ? word.level : null);

  document.getElementById('btn-prev').disabled    = idx === 0;
  document.getElementById('btn-next').textContent = idx === tot - 1 ? 'Finish ✓' : 'Next →';

  setFlipped(false);
}

/** Fills `el` with one span per unit, colored by tone (classes tone-1 … tone-5). */
function renderWithTones(el, units, tones, separator) {
  const nodes = units.flatMap((unit, i) => {
    const span = document.createElement('span');
    span.className   = `tone-${tones[i]}`;
    span.textContent = unit;
    return i > 0 && separator ? [separator, span] : [span];
  });
  el.replaceChildren(...nodes);
}

export function speakCurrentWord() {
  speak(session.words[session.currentIndex].hanzi);
}

export function updateLevelBadge(level) {
  const els = [
    document.getElementById('word-level-front'),
    document.getElementById('word-level-back'),
  ];
  if (level) {
    els.forEach(el => { el.textContent = `HSK ${level}`; el.classList.add('visible'); });
  } else {
    els.forEach(el => el.classList.remove('visible'));
  }
}

export function updateStatusBadge(id) {
  const els = [
    document.getElementById('card-status-front'),
    document.getElementById('card-status-back'),
  ];

  if (session.known.has(id)) {
    els.forEach(el => { el.textContent = '✓ Got it'; el.className = 'card-status known-badge'; });
  } else if (session.unknown.has(id)) {
    els.forEach(el => { el.textContent = '✗ Review'; el.className = 'card-status unknown-badge'; });
  } else {
    els.forEach(el => { el.textContent = ''; el.className = 'card-status'; });
  }
}

export function setFlipped(flipped) {
  session.isFlipped = flipped;
  document.getElementById('flashcard').classList.toggle('flipped', flipped);
  document.getElementById('assess-row').classList.toggle('visible', flipped);
}

export function markAndAdvance(verdict) {
  const word = session.words[session.currentIndex];
  const { id } = word;
  if (verdict === 'known') {
    session.known.add(id);
    session.unknown.delete(id);
    if (recordAnswer(word, true)) session.promoted.add(id);
  } else {
    session.unknown.add(id);
    session.known.delete(id);
    session.promoted.delete(id);
    recordAnswer(word, false);
  }
  updateStatusBadge(id);

  if (session.currentIndex < session.words.length - 1) {
    session.currentIndex++;
    renderCard();
  } else {
    document.dispatchEvent(new CustomEvent('hsk:session-end'));
  }
}

export function initFlashcard() {
  const card = document.getElementById('flashcard');

  // ---- Pronunciation (only shown when the device has a Chinese voice) ----
  initSpeech(hasVoice => {
    document.querySelectorAll('.btn-listen, .kbd-listen').forEach(el => { el.hidden = !hasVoice; });
  });
  document.querySelectorAll('.btn-listen').forEach(btn => {
    // Keep taps and keys on the button from flipping the card underneath
    btn.addEventListener('click', e => { e.stopPropagation(); speakCurrentWord(); });
    btn.addEventListener('keydown', e => e.stopPropagation());
  });

  // ---- Swipe gesture (mobile) ----
  let touchStartX = 0;
  let touchStartY = 0;
  let swipeConsumed = false;

  card.addEventListener('touchstart', e => {
    touchStartX  = e.touches[0].clientX;
    touchStartY  = e.touches[0].clientY;
    swipeConsumed = false;
  }, { passive: true });

  card.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    // Swipe: horizontal dominant + min 52px travel
    if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swipeConsumed = true;
      // Brief timeout so the subsequent click event is ignored
      setTimeout(() => { swipeConsumed = false; }, 350);
      markAndAdvance(dx > 0 ? 'known' : 'unknown');
    }
  }, { passive: true });

  // ---- Tap / click (flip) — guard against post-swipe click ----
  card.addEventListener('click', () => {
    if (swipeConsumed) return;
    setFlipped(!session.isFlipped);
  });
  card.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(!session.isFlipped); }
  });

  document.getElementById('btn-prev').addEventListener('click', () => {
    if (session.currentIndex > 0) { session.currentIndex--; renderCard(); }
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    if (session.currentIndex < session.words.length - 1) {
      session.currentIndex++;
      renderCard();
    } else {
      document.dispatchEvent(new CustomEvent('hsk:session-end'));
    }
  });

  document.getElementById('btn-know').addEventListener('click',   () => markAndAdvance('known'));
  document.getElementById('btn-review').addEventListener('click', () => markAndAdvance('unknown'));
}
