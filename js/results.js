import { session, cfg } from './state.js';
import { showScreen } from './utils.js';
import { playSound } from './sound.js';
import { t } from './i18n.js';

function levelLabel() {
  if (session.mode === 'review') return t('results.daily');
  if (cfg.level === 'combo') {
    return t('results.combo', { levels: cfg.comboLevels.join(' + ') });
  }
  return `HSK ${cfg.level}`;
}

export function showResults() {
  const total    = session.words.length;
  const known    = session.known.size;
  const toReview = session.unknown.size;
  const unrated  = total - known - toReview;
  const pct      = total > 0 ? Math.round((known / total) * 100) : 0;

  document.getElementById('r-total').textContent  = total;
  document.getElementById('r-known').textContent  = known;
  document.getElementById('r-review').textContent = toReview + unrated;

  const label = levelLabel();
  document.getElementById('results-sub-header').textContent = label;

  document.getElementById('score-fill').style.width = '0%';
  setTimeout(() => { document.getElementById('score-fill').style.width = `${pct}%`; }, 80);
  // After the last card's own sound
  setTimeout(() => playSound(pct >= 70 ? 'great' : 'finish'), 300);

  let emoji, title;
  if (pct >= 90)      { emoji = '🏆'; title = t('results.perfect'); }
  else if (pct >= 70) { emoji = '🎉'; title = t('results.great'); }
  else if (pct >= 40) { emoji = '💪'; title = t('results.good'); }
  else                { emoji = '📚'; title = t('results.practice'); }

  document.getElementById('r-emoji').textContent = emoji;
  document.getElementById('r-title').textContent = title;
  document.getElementById('r-sub').textContent = t('results.sub', { count: total, label });

  const promoted = session.promoted.size;
  const promotedEl = document.getElementById('r-promoted');
  promotedEl.textContent = t('results.promoted', { count: promoted });
  promotedEl.hidden = promoted === 0;

  document.getElementById('btn-undo-results').hidden = session.history.length === 0;

  document.getElementById('btn-retry-unknown').style.display =
    known < total ? '' : 'none';

  showScreen('results-screen');
}
