import { cfg, session, cache, DATA_URLS } from './state.js';
import { rawToWords, sortWords, shuffle, showScreen } from './utils.js';
import { initSetup, readSetupConfig, saveSetupState, renderProgressSummary } from './setup.js';
import { initFlashcard, renderCard, toggleFlip, markAndAdvance, speakCurrentWord, undoLastRating } from './flashcard.js';
import { showResults } from './results.js';
import { getDueEntries, resetProgress } from './progress.js';
import { resetActivity } from './activity.js';
import { createBackup, parseBackup, restoreBackup } from './backup.js';
import { renderStats } from './stats.js';
import { initTheme } from './theme.js';
import { initI18n, t, formatDate } from './i18n.js';
import { preloadSounds } from './sound.js';
import { initNavigation, openView, closeView } from './navigation.js';
import { initGuide, resetGuide, showGuideTopic } from './guide.js';

/** Shows the loading screen, then starts a session with the words from `getWords`. */
async function startSession(getWords) {
  showScreen('loading-screen');
  preloadSounds();

  try {
    const words = await getWords();
    // e.g. due ids that no longer exist after a vocabulary update
    if (!words.length) return closeView();

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
    closeView();
    showMessage(t('error.loadTitle'), t('error.loadBody'));
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

// Pages over the home screen: switching between them (desktop navigation)
// replaces the page, so back still returns home in one step
const PAGES = ['settings-screen', 'guide-screen', 'stats-screen'];

function openPage(screenId) {
  if (isShown(screenId)) return;
  const isOnPage = PAGES.some(isShown);
  showScreen(screenId);
  if (!isOnPage) openView(showSetup);
}

function openSettings() {
  openPage('settings-screen');
}

function openStats() {
  if (isShown('stats-screen')) return;
  renderStats();
  openPage('stats-screen');
  window.scrollTo(0, 0);
}

/** Opens the guide, at a topic or section when `topicId` is given. */
function openGuide(topicId = null) {
  if (!isShown('guide-screen')) {
    resetGuide();
    openPage('guide-screen');
    window.scrollTo(0, 0);
  }
  if (topicId) showGuideTopic(topicId);
}

/** "?" buttons: the options sheet closes first, so back from the guide returns home. */
async function handleHelpClick(topicId) {
  if (document.getElementById('options-sheet').open) await closeView();
  openGuide(topicId);
}

/** Saves the progress and stats to a file in the downloads. */
function exportBackup() {
  const { name, text } = createBackup();
  const url  = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href     = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // Safari still needs it right after the click
}

let pendingBackup = null;

/** Checks the chosen file, then asks before replacing the progress. */
async function handleImportFile(e) {
  const file = e.target.files[0];
  e.target.value = ''; // so choosing the same file again still fires `change`
  if (!file) return;

  pendingBackup = parseBackup(await file.text());
  if (!pendingBackup) {
    showMessage(t('backup.notTitle'), t('backup.notBody'));
    return;
  }
  const { exportedAt, wordCount } = pendingBackup;
  const words = wordsText(wordCount);
  document.getElementById('import-dialog-body').textContent = exportedAt
    ? t('backup.confirm', { words, date: formatDate(exportedAt, { month: 'short', day: 'numeric', year: 'numeric' }) })
    : t('backup.confirmNoDate', { words });
  document.getElementById('import-dialog').classList.add('visible');
}

function importBackup() {
  restoreBackup(pendingBackup);
  renderProgressSummary();
  showMessage(t('backup.doneTitle'), t('backup.doneBody', { words: wordsText(pendingBackup.wordCount) }));
  pendingBackup = null;
}

function wordsText(count) {
  return t('common.words', { count });
}

function isShown(screenId) {
  return document.getElementById(screenId).classList.contains('active');
}

/** Session screens are one view: the system back button asks before quitting a session. */
function openSessionView() {
  openView(showSetup, handleSessionBack);
}

function handleSessionBack() {
  const quitDialog = document.getElementById('quit-dialog');
  if (quitDialog.classList.contains('visible')) quitDialog.classList.remove('visible');
  else if (isShown('flashcard-screen')) quitDialog.classList.add('visible');
  else if (isShown('results-screen')) closeView();
}

function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (!document.getElementById('flashcard-screen').classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        toggleFlip();
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
  initI18n();
  initNavigation();
  initSetup();
  initFlashcard();
  initGuide();
  initKeyboard();
  renderProgressSummary();

  document.addEventListener('hsk:session-end', showResults);

  document.getElementById('btn-start').addEventListener('click', () => {
    readSetupConfig();
    saveSetupState();
    if (cfg.level === 'combo' && !cfg.comboLevels.length) {
      document.getElementById('combo-hint').hidden = false;
      return;
    }
    session.mode = 'standard';
    openSessionView();
    startSession(selectConfiguredWords);
  });

  document.getElementById('btn-review-today').addEventListener('click', () => {
    readSetupConfig(); // card mode still applies
    saveSetupState();
    session.mode = 'review';
    openSessionView();
    startSession(selectDueWords);
  });

  document.getElementById('btn-open-settings').addEventListener('click', openSettings);
  document.getElementById('btn-close-settings').addEventListener('click', closeView);
  document.getElementById('nav-settings').addEventListener('click', openSettings);
  document.getElementById('btn-open-guide').addEventListener('click', () => openGuide());
  document.getElementById('btn-close-guide').addEventListener('click', closeView);
  document.getElementById('nav-guide').addEventListener('click', () => openGuide());
  document.getElementById('btn-open-stats').addEventListener('click', openStats);
  document.getElementById('btn-close-stats').addEventListener('click', closeView);
  document.getElementById('nav-stats').addEventListener('click', openStats);
  document.querySelectorAll('.btn-help').forEach(btn => {
    btn.addEventListener('click', () => handleHelpClick(btn.dataset.guide));
  });
  document.getElementById('nav-home').addEventListener('click', () => {
    if (PAGES.some(isShown)) closeView();
  });

  document.getElementById('btn-export-progress').addEventListener('click', exportBackup);
  document.getElementById('btn-import-progress').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', handleImportFile);

  initDialog('quit-dialog', document.getElementById('btn-quit'), closeView);
  initDialog('reset-dialog', document.getElementById('btn-reset-progress'), () => {
    resetProgress();
    resetActivity();
    renderProgressSummary();
  });
  initDialog('import-dialog', null, importBackup);

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

  document.getElementById('btn-new-config').addEventListener('click', closeView);
  document.getElementById('btn-undo-results').addEventListener('click', undoLastRating);

  const messageDialog = document.getElementById('message-dialog');
  const closeMessage  = () => messageDialog.classList.remove('visible');
  document.getElementById('message-dialog-ok').addEventListener('click', closeMessage);
  messageDialog.addEventListener('click', e => { if (e.target === messageDialog) closeMessage(); });
}

/** Shows an information dialog with a single OK button. */
function showMessage(title, body) {
  const dialog = document.getElementById('message-dialog');
  document.getElementById('message-dialog-title').textContent = title;
  document.getElementById('message-dialog-body').textContent  = body;
  dialog.classList.add('visible');
  document.getElementById('message-dialog-ok').focus();
}

/** Wires a confirmation dialog: `trigger` (if any) opens it, the confirm button runs `handleConfirm`. */
function initDialog(dialogId, trigger, handleConfirm) {
  const dialog = document.getElementById(dialogId);
  const close  = () => dialog.classList.remove('visible');

  trigger?.addEventListener('click', () => dialog.classList.add('visible'));
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
