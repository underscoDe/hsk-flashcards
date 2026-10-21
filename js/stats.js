import { getRecentDays, getStreaks } from './activity.js';
import { countRatedWords, getMasteredByLevel } from './progress.js';

const CHART_DAYS = 30;

/** Fills the stats page; called each time it opens. */
export function renderStats() {
  const days  = getRecentDays(CHART_DAYS);
  const today = days.at(-1);

  renderStreak(getStreaks(), today.reviewed > 0);
  document.getElementById('st-today').textContent    = today.reviewed;
  document.getElementById('st-seen').textContent     = countRatedWords();
  document.getElementById('st-mastered').textContent = sum(Object.values(getMasteredByLevel()));
  renderChart(days);
}

/** Text of the stats link in the home review card. */
export function statsLinkText() {
  const { current } = getStreaks();
  return current > 0 ? `🔥 ${current}-day streak · Stats ›` : 'See your stats ›';
}

function renderStreak({ current, best }, hasStudiedToday) {
  document.getElementById('streak-current').textContent = daysText(current);
  document.getElementById('streak-best').textContent    = best;
  document.getElementById('streak-text').textContent    = streakMessage(current, hasStudiedToday);
}

function streakMessage(current, hasStudiedToday) {
  if (current === 0) return 'Rate a card today to start a streak';
  if (!hasStudiedToday) return 'Rate a card today to keep it going';
  return 'Current streak, keep it up!';
}

/** One bar per day; the darker bottom part is the new words. Tapping a bar shows its numbers. */
function renderChart(days) {
  const max = Math.max(1, ...days.map(day => day.reviewed));

  const bars = days.map((day, i) => {
    const detail = dayDetail(day, i === days.length - 1);
    const column = document.createElement('button');
    column.className = 'chart-day';
    column.setAttribute('aria-label', detail);
    column.addEventListener('click', () => selectDay(column, detail));
    column.addEventListener('pointerenter', () => selectDay(column, detail));

    const bar = document.createElement('span');
    bar.className    = 'chart-bar';
    bar.style.height = `${(day.reviewed / max) * 100}%`;
    const fresh = document.createElement('span');
    fresh.className    = 'chart-bar-new';
    fresh.style.height = `${day.reviewed ? (day.new / day.reviewed) * 100 : 0}%`;

    bar.append(fresh);
    column.append(bar);
    return column;
  });

  document.getElementById('activity-chart').replaceChildren(...bars);
  document.getElementById('chart-start').textContent = formatDate(days[0].date);
  selectDay(bars.at(-1), bars.at(-1).getAttribute('aria-label'));

  const reviewed   = sum(days.map(day => day.reviewed));
  const newWords   = sum(days.map(day => day.new));
  const activeDays = days.filter(day => day.reviewed > 0).length;
  document.getElementById('chart-summary').textContent = reviewed
    ? `${cardsText(reviewed)} over ${daysText(activeDays)}, ${newWords} of them new words.`
    : 'No cards rated in the last 30 days yet.';
}

function selectDay(column, detail) {
  document.querySelectorAll('.chart-day.selected').forEach(el => el.classList.remove('selected'));
  column.classList.add('selected');
  document.getElementById('chart-detail').textContent = detail;
}

function dayDetail(day, isToday) {
  const label = isToday ? 'Today' : formatDate(day.date);
  if (!day.reviewed) return `${label}: no cards`;
  return `${label}: ${cardsText(day.reviewed)}, ${day.new} new`;
}

// '2026-10-21' → 'Oct 21'
function formatDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function cardsText(count) {
  return `${count} card${count === 1 ? '' : 's'}`;
}

function daysText(count) {
  return `${count} day${count === 1 ? '' : 's'}`;
}

function sum(numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}
