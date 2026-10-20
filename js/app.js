import { cfg, session, cache, DATA_URLS } from './state.js';
import { rawToWords, sortWords, shuffle, showScreen } from './utils.js';
import { initSetup, readSetupConfig, saveSetupState, renderProgressSummary } from './setup.js';
import { initFlashcard, renderCard, setFlipped, markAndAdvance, speakCurrentWord, undoLastRating } from './flashcard.js';
import { showResults } from './results.js';
import { getDueEntries, resetProgress } from './progress.js';
import { initTheme } from './theme.js';

/** Shows the loading screen, then starts a session with the words from `getWords`. */
async function startSession(getWords) {
  showScreen('loading-screen');

  try {
    const words = await getWords();
    // e.g. due ids that no longer exist after a vocabulary update
    if (!words.length) return showSetup();

    session.words        = words;
    session.currentIndex = 0;
    session.isFlipped    = false;
    session.showsLevel   = new Set(words.map(w => w.level)).size > 1;
    session.known        = new Set();
    session.unknown      = new Set();
    session.promoted     = new Set();
    session.history      = [];

    showScreen('flashcard-screen');
    renderCard();
  } catch (err) {
    console.error(err);
    alert('Could not load vocabulary data. Please check your internet connection.');
    showSetup();
  }
}

async function selectConfiguredWords() {
  const levels = cfg.level === 'combo' ? cfg.comboLevels : [cfg.level];
  const allWords = (await Promise.all(levels.map(loadLevel))).flat();

  const sorted = sortWords(allWords, cfg.order);
  let selected;

  const { rangeFrom: from, rangeTo: to } = cfg;
  const count = isFinite(cfg.count) ? Math.min(cfg.count, sorted.length) : sorted.length;

  if (from && to && from <= to && from <= sorted.length) {
    // 1-indexed, clamp `to` so we never exceed available words
    selected = sorted.slice(from - 1, Math.min(to, sorted.length));
  } else {
    selected = sorted.slice(0, count);
  }

  return cfg.presentationShuffle ? shuffle(selected) : selected;
}

async function selectDueWords() {
  const due = getDueEntries();
  const dueIds = new Set(due.map(entry => entry.id));
  const levels = [...new Set(due.map(entry => entry.level))];
  const allWords = (await Promise.all(levels.map(loadLevel))).flat();
  return shuffle(allWords.filter(w => dueIds.has(w.id)));
}

async function loadLevel(level) {
  if (!cache[level]) {
    const res = await fetch(DATA_URLS[level]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cache[level] = await res.json();
  }
  return rawToWords(cache[level], level);
}

function showSetup() {
  renderProgressSummary();
  showScreen('setup-screen');
}

function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (!document.getElementById('flashcard-screen').classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        setFlipped(!session.isFlipped);
        break;
      case 'ArrowLeft':
        document.getElementById('btn-prev').click();
        break;
      case 'ArrowRight':
        document.getElementById('btn-next').click();
        break;
      case 'k': case 'K':
        markAndAdvance('known');
        break;
      case 'u': case 'U':
        markAndAdvance('unknown');
        break;
      case 'p': case 'P':
        speakCurrentWord();
        break;
      case 'z': case 'Z':
        undoLastRating();
        break;
    }
  });
}


function init() {
  document.getElementById('footer-year').textContent = new Date().getFullYear();
  initTheme();
  initSetup();
  initFlashcard();
  initKeyboard();
  renderProgressSummary();

  document.addEventListener('hsk:session-end', showResults);

  document.getElementById('btn-start').addEventListener('click', () => {
    readSetupConfig();
    saveSetupState();
    if (cfg.level === 'combo' && !cfg.comboLevels.length) {
      alert('Please select at least one level for Combo mode.');
      return;
    }
    session.mode = 'standard';
    startSession(selectConfiguredWords);
  });

  document.getElementById('btn-review-today').addEventListener('click', () => {
    readSetupConfig(); // card mode still applies
    saveSetupState();
    session.mode = 'review';
    startSession(selectDueWords);
  });

  initDialog('quit-dialog', document.getElementById('btn-quit'), showSetup);
  initDialog('reset-dialog', document.getElementById('btn-reset-progress'), () => {
    resetProgress();
    renderProgressSummary();
  });

  document.getElementById('btn-retry-unknown').addEventListener('click', () => {
    // Unrated (skipped) words count as "to review" in the results, so include them
    const missedWords = session.words.filter(w => !session.known.has(w.id));
    startSession(() => sortWords(missedWords, cfg.order));
  });

  // Replay the same words; reshuffle only if the session was shuffled
  document.getElementById('btn-restart').addEventListener('click', () => {
    const isShuffled = session.mode === 'review' || cfg.order === 'random' || cfg.presentationShuffle;
    const words = session.words;
    startSession(() => isShuffled ? shuffle(words) : words);
  });

  document.getElementById('btn-new-config').addEventListener('click', showSetup);
  document.getElementById('btn-undo-results').addEventListener('click', undoLastRating);
}

/** Wires a confirmation dialog: `trigger` opens it, the confirm button runs `handleConfirm`. */
function initDialog(dialogId, trigger, handleConfirm) {
  const dialog = document.getElementById(dialogId);
  const close  = () => dialog.classList.remove('visible');

  trigger.addEventListener('click', () => dialog.classList.add('visible'));
  dialog.querySelector('.dialog-btn-cancel').addEventListener('click', close);
  dialog.querySelector('.dialog-btn-confirm').addEventListener('click', () => {
    close();
    handleConfirm();
  });
  dialog.addEventListener('click', e => {
    if (e.target === dialog) close();
  });
}

init();
