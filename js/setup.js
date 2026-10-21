import { cfg, LEVEL_COUNTS } from './state.js';
import { readStorage, writeStorage } from './utils.js';
import { getThemePreference, setThemePreference } from './theme.js';
import { getSoundPreference, setSoundPreference, playSound } from './sound.js';
import { getLanguagePreference, setLanguagePreference, t } from './i18n.js';
import { getDueEntries, getDaysUntilNextReview, getMasteredByLevel, hasProgress } from './progress.js';
import { initSheet } from './sheet.js';
import { statsLinkText } from './stats.js';

export function initSetup() {
  document.querySelectorAll('button[data-group]').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      const value = btn.dataset.value;

      // Clicking the active combo button closes it and reverts to HSK 1
      if (group === 'level' && value === 'combo' && btn.classList.contains('active')) {
        document.querySelectorAll('[data-group="level"]').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-group="level"][data-value="1"]').classList.add('active');
        updateComboPanel('1');
        return;
      }

      document.querySelectorAll(`[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (group === 'count') {
        document.getElementById('custom-count').value = '';
      }
      if (group === 'order') {
        updateShuffleRow(value);
        updateRangeRow(value);
      }
      if (group === 'level') {
        updateComboPanel(value);
      }
      if (group === 'theme') {
        setThemePreference(value);
      }
      if (group === 'sound') {
        setSoundPreference(value);
        playSound('known'); // a sample, silent when turned off
      }
      if (group === 'language') {
        setLanguagePreference(value);
      }
    });
  });

  document.getElementById('btn-reset-settings').addEventListener('click', () => {
    applySetupState(DEFAULT_SETUP);
    saveSetupState();
    selectOption('theme', 'system');
    markActive('sound', 'on');
    setSoundPreference('on');
    selectOption('language', 'auto');
    renderOptionsSummary();
  });

  const sheet = document.getElementById('options-sheet');
  initSheet(sheet, document.getElementById('btn-open-options'), document.getElementById('btn-close-options'));
  sheet.addEventListener('close', renderOptionsSummary);

  // The "select at least one level" hint goes away as soon as a level is ticked
  document.querySelectorAll('.combo-check').forEach(cb => {
    cb.addEventListener('change', () => { document.getElementById('combo-hint').hidden = true; });
  });

  document.getElementById('custom-count').addEventListener('input', e => {
    if (e.target.value) {
      document.querySelectorAll('[data-group="count"]').forEach(b => b.classList.remove('active'));
    }
  });

  // Dim count section and show validation hint when range inputs change
  const rangeFrom = document.getElementById('range-from');
  const rangeTo   = document.getElementById('range-to');
  const rangeHint = document.getElementById('range-hint');
  const countSection = document.getElementById('count-section');

  const updateRangeState = () => {
    const from = parseInt(rangeFrom.value);
    const to   = parseInt(rangeTo.value);
    const fromOk = !isNaN(from) && from >= 1;
    const toOk   = !isNaN(to)   && to   >= 1;

    if (fromOk && toOk && from > to) {
      rangeHint.textContent = t('range.invalid');
      rangeHint.style.color = 'var(--error)';
      countSection.classList.remove('count-overridden');
    } else if (fromOk && toOk) {
      rangeHint.textContent = t('range.selected', { from, to, words: t('common.words', { count: to - from + 1 }) });
      rangeHint.style.color = 'var(--primary)';
      countSection.classList.add('count-overridden');
    } else {
      rangeHint.textContent = t('options.rangeHint');
      rangeHint.style.color = '';
      countSection.classList.remove('count-overridden');
    }
  };

  rangeFrom.addEventListener('input', updateRangeState);
  rangeTo.addEventListener('input',   updateRangeState);

  markActive('theme', getThemePreference());
  markActive('sound', getSoundPreference());
  markActive('language', getLanguagePreference());
  const saved = readStorage(SETTINGS_KEY);
  if (saved && typeof saved === 'object') applySetupState(saved);
  renderOptionsSummary();

  // Texts written here follow the language too
  document.addEventListener('hsk:language-change', () => {
    updateRangeState();
    renderOptionsSummary();
    renderProgressSummary();
  });
}

const CARD_MODE_LABELS = {
  'hanzi-first':  'mode.hanziFirst',
  'pinyin-first': 'mode.pinyinFirst',
  'type-pinyin':  'mode.typePinyin',
};
const ORDER_LABELS = { asc: 'A→Z', desc: 'Z→A' };

/** One line under "Session options", e.g. "Type pinyin · A→Z · 25 words". */
function renderOptionsSummary() {
  readSetupConfig();
  const { cardMode, order, presentationShuffle, rangeFrom, rangeTo, count } = cfg;
  const words = rangeFrom && rangeTo && rangeFrom <= rangeTo ? t('summary.range', { from: rangeFrom, to: rangeTo })
    : isFinite(count) ? t('common.words', { count })
    : t('summary.all');
  document.getElementById('options-summary').textContent = [
    t(CARD_MODE_LABELS[cardMode]),
    (ORDER_LABELS[order] ?? t('order.random')) + (presentationShuffle ? t('summary.shuffled') : ''),
    words,
  ].join(' · ');
}

const SETTINGS_KEY = 'hsk-settings';

// Must match the options marked active in index.html
const DEFAULT_SETUP = {
  level: '1', comboLevels: [], cardMode: 'hanzi-first', order: 'random', shuffle: false,
  count: '25', customCount: '', rangeFrom: '', rangeTo: '',
};

/** Remembers the setup screen as it is, so the next visit starts from the same choices. */
export function saveSetupState() {
  const activeValue = group => document.querySelector(`[data-group="${group}"].active`)?.dataset.value ?? null;
  writeStorage(SETTINGS_KEY, {
    level:       activeValue('level'),
    comboLevels: [...document.querySelectorAll('.combo-check:checked')].map(cb => cb.value),
    cardMode:    activeValue('card-mode'),
    order:       activeValue('order'),
    shuffle:     document.getElementById('toggle-shuffle').checked,
    count:       activeValue('count'),
    customCount: document.getElementById('custom-count').value,
    rangeFrom:   document.getElementById('range-from').value,
    rangeTo:     document.getElementById('range-to').value,
  });
}

// Replays a setup state through the regular click/input handlers, so the
// dependent rows (combo panel, shuffle, range) show up exactly as if clicked.
function applySetupState(state) {
  const fill = (id, value) => {
    if (typeof value !== 'string') return;
    const input = document.getElementById(id);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  if (Array.isArray(state.comboLevels)) {
    document.querySelectorAll('.combo-check').forEach(cb => { cb.checked = state.comboLevels.includes(cb.value); });
  }
  selectOption('level', state.level);
  selectOption('card-mode', state.cardMode);
  selectOption('order', state.order);
  selectOption('count', state.count);
  fill('custom-count', state.customCount);
  fill('range-from', state.rangeFrom);
  fill('range-to', state.rangeTo);
  if (state.order !== 'random') document.getElementById('toggle-shuffle').checked = state.shuffle === true;
}

function selectOption(group, value) {
  if (typeof value !== 'string') return;
  document.querySelector(`[data-group="${group}"][data-value="${CSS.escape(value)}"]`)?.click();
}

// Highlights an option without running its click handler
function markActive(group, value) {
  document.querySelectorAll(`[data-group="${group}"]`).forEach(b => {
    b.classList.toggle('active', b.dataset.value === value);
  });
}

/** Refreshes the daily review block and the per-level mastery bars. */
export function renderProgressSummary() {
  renderDailyReview();
  renderLevelProgress();
}

function renderDailyReview() {
  const section = document.getElementById('review-section');
  section.hidden = !hasProgress();
  document.getElementById('btn-reset-progress').disabled = section.hidden;
  document.getElementById('btn-export-progress').disabled = section.hidden;
  if (section.hidden) return;

  document.getElementById('btn-open-stats').textContent = statsLinkText();

  const dueCount = getDueEntries().length;
  document.getElementById('btn-review-today').hidden = dueCount === 0;
  document.getElementById('review-text').textContent = dueCount > 0
    ? t('review.due', { count: dueCount })
    : nextReviewText(getDaysUntilNextReview());
}

function renderLevelProgress() {
  const mastered = getMasteredByLevel();
  document.querySelectorAll('.btn-level').forEach(btn => {
    const level = btn.dataset.value;
    const total = LEVEL_COUNTS[level];
    const count = mastered[level] ?? 0;
    btn.querySelector('.level-count').textContent = count
      ? t('level.mastered', { count, total })
      : t('common.words', { count: total });
    btn.querySelector('.level-progress').hidden = count === 0;
    btn.querySelector('.level-progress-fill').style.width = `${(count / total) * 100}%`;
  });
  document.querySelectorAll('.combo-item').forEach(item => {
    const total = LEVEL_COUNTS[item.querySelector('.combo-check').value];
    item.querySelector('.combo-label small').textContent = t('common.words', { count: total });
  });
}

function nextReviewText(days) {
  if (days === 1) return t('review.tomorrow');
  return t('review.inDays', { count: days });
}

function updateShuffleRow(order) {
  const row = document.getElementById('shuffle-row');
  if (order === 'random') {
    row.classList.remove('visible');
    document.getElementById('toggle-shuffle').checked = false;
  } else {
    row.classList.add('visible');
  }
}

function updateRangeRow(order) {
  const row = document.getElementById('range-row');
  if (order === 'random') {
    row.classList.remove('visible');
    document.getElementById('range-from').value = '';
    document.getElementById('range-to').value   = '';
    document.getElementById('range-hint').textContent = t('options.rangeHint');
    document.getElementById('range-hint').style.color = '';
    document.getElementById('count-section').classList.remove('count-overridden');
  } else {
    row.classList.add('visible');
  }
}

function updateComboPanel(level) {
  const panel = document.getElementById('combo-panel');
  document.getElementById('combo-hint').hidden = true;
  if (level === 'combo') {
    panel.classList.add('visible');
    const anyChecked = [...document.querySelectorAll('.combo-check')].some(cb => cb.checked);
    if (!anyChecked) {
      document.querySelector('.combo-check[value="1"]').checked = true;
      document.querySelector('.combo-check[value="2"]').checked = true;
    }
  } else {
    panel.classList.remove('visible');
  }
}

export function readSetupConfig() {
  const g = group => document.querySelector(`[data-group="${group}"].active`);

  cfg.level = g('level') ? g('level').dataset.value : '1';
  cfg.order = g('order') ? g('order').dataset.value : 'random';

  if (cfg.level === 'combo') {
    cfg.comboLevels = [...document.querySelectorAll('.combo-check:checked')]
      .map(cb => cb.value)
      .sort();
  } else {
    cfg.comboLevels = [];
  }

  cfg.presentationShuffle = cfg.order !== 'random'
    && document.getElementById('toggle-shuffle').checked;

  const cardModeBtn = document.querySelector('[data-group="card-mode"].active');
  cfg.cardMode = cardModeBtn ? cardModeBtn.dataset.value : 'hanzi-first';

  // Range (only meaningful when ordered)
  const fromVal = parseInt(document.getElementById('range-from').value);
  const toVal   = parseInt(document.getElementById('range-to').value);
  cfg.rangeFrom = (cfg.order !== 'random' && fromVal >= 1) ? fromVal : null;
  cfg.rangeTo   = (cfg.order !== 'random' && toVal   >= 1) ? toVal   : null;

  const customVal = parseInt(document.getElementById('custom-count').value);
  if (customVal > 0) {
    cfg.count = customVal;
  } else if (g('count')) {
    cfg.count = g('count').dataset.value === 'all' ? Infinity : parseInt(g('count').dataset.value);
  } else {
    cfg.count = 25;
  }
}
