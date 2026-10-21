import { session, cfg } from './state.js';
import { showScreen } from './utils.js';
import { playSound } from './sound.js';

function levelLabel() {
  if (session.mode === 'review') return 'Daily review';
  if (cfg.level === 'combo') {
    return `Combo — HSK ${cfg.comboLevels.join(' + ')}`;
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
  if (pct >= 90)      { emoji = '🏆'; title = 'Perfect, excellent work!'; }
  else if (pct >= 70) { emoji = '🎉'; title = 'Great job!'; }
  else if (pct >= 40) { emoji = '💪'; title = 'Good, keep it up!'; }
  else                { emoji = '📚'; title = 'Keep practicing!'; }

  document.getElementById('r-emoji').textContent = emoji;
  document.getElementById('r-title').textContent = title;
  document.getElementById('r-sub').textContent =
    `${total} word${total > 1 ? 's' : ''} reviewed — ${label}`;

  const promoted = session.promoted.size;
  const promotedEl = document.getElementById('r-promoted');
  promotedEl.textContent = `📈 ${promoted} word${promoted > 1 ? 's' : ''} moved to a longer review interval`;
  promotedEl.hidden = promoted === 0;

  document.getElementById('btn-undo-results').hidden = session.history.length === 0;

  document.getElementById('btn-retry-unknown').style.display =
    known < total ? '' : 'none';

  showScreen('results-screen');
}
