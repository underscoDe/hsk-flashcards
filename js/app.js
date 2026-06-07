import { cfg, session, cache, DATA_URLS } from './state.js';
import { rawToWords, sortWords, shuffle, showScreen } from './utils.js';
import { initSetup, readSetupConfig } from './setup.js';
import { initFlashcard, renderCard, setFlipped, markAndAdvance } from './flashcard.js';
import { showResults } from './results.js';

export async function loadAndStart(wordsOverride = null) {
  showScreen('loading-screen');

  try {
    if (wordsOverride) {
      session.words        = wordsOverride;
      session.currentIndex = 0;
      session.isFlipped    = false;
      session.known        = new Set();
      session.unknown      = new Set();
      showScreen('flashcard-screen');
      renderCard();
      return;
    }

    let allWords = [];

    if (cfg.level === 'combo') {
      if (!cfg.comboLevels.length) {
        alert('Please select at least one level for Combo mode.');
        showScreen('setup-screen');
        return;
      }
      for (const lvl of cfg.comboLevels) {
        if (!cache[lvl]) {
          const res = await fetch(DATA_URLS[lvl]);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          cache[lvl] = await res.json();
        }
        allWords.push(...rawToWords(cache[lvl], lvl));
      }
    } else {
      if (!cache[cfg.level]) {
        const res = await fetch(DATA_URLS[cfg.level]);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        cache[cfg.level] = await res.json();
      }
      allWords = rawToWords(cache[cfg.level]);
    }

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

    if (cfg.presentationShuffle) {
      selected = shuffle(selected);
    }

    session.words        = selected;
    session.currentIndex = 0;
    session.isFlipped    = false;
    session.known        = new Set();
    session.unknown      = new Set();

    showScreen('flashcard-screen');
    renderCard();
  } catch (err) {
    console.error(err);
    alert('Could not load vocabulary data. Please check your internet connection.');
    showScreen('setup-screen');
  }
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
    }
  });
}

function initInstallBanner() {
  const banner  = document.getElementById('install-banner');
  const msg     = document.getElementById('install-banner-msg');
  const btnInstall  = document.getElementById('install-btn-confirm');
  const btnDismiss  = document.getElementById('install-btn-dismiss');

  if (localStorage.getItem('install-dismissed')) return;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true;

  if (isStandalone) return;

  let deferredPrompt = null;

  if (isIos) {
    msg.textContent = 'Tap Share then "Add to Home Screen" to install';
    btnInstall.style.display = 'none';
    banner.classList.add('visible');
  } else {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      banner.classList.add('visible');
    });
  }

  btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    banner.classList.remove('visible');
    if (outcome === 'accepted') localStorage.setItem('install-dismissed', '1');
  });

  btnDismiss.addEventListener('click', () => {
    banner.classList.remove('visible');
    localStorage.setItem('install-dismissed', '1');
  });

  window.addEventListener('appinstalled', () => {
    banner.classList.remove('visible');
    localStorage.setItem('install-dismissed', '1');
  });
}

function init() {
  document.getElementById('footer-year').textContent = new Date().getFullYear();
  initSetup();
  initInstallBanner();
  initFlashcard();
  initKeyboard();

  document.addEventListener('hsk:session-end', showResults);

  document.getElementById('btn-start').addEventListener('click', () => {
    readSetupConfig();
    loadAndStart();
  });

  const quitDialog  = document.getElementById('quit-dialog');
  const quitConfirm = document.getElementById('quit-confirm');
  const quitCancel  = document.getElementById('quit-cancel');

  document.getElementById('btn-quit').addEventListener('click', () => {
    quitDialog.classList.add('visible');
  });
  quitCancel.addEventListener('click', () => {
    quitDialog.classList.remove('visible');
  });
  quitConfirm.addEventListener('click', () => {
    quitDialog.classList.remove('visible');
    showScreen('setup-screen');
  });
  quitDialog.addEventListener('click', e => {
    if (e.target === quitDialog) quitDialog.classList.remove('visible');
  });

  document.getElementById('btn-retry-unknown').addEventListener('click', () => {
    const unknownWords = session.words.filter(w => session.unknown.has(w.hanzi));
    loadAndStart(sortWords(unknownWords, cfg.order));
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    loadAndStart();
  });

  document.getElementById('btn-new-config').addEventListener('click', () => {
    showScreen('setup-screen');
  });
}

init();
