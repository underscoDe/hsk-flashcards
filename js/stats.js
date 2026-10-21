import { getRecentDays, getStreaks } from './activity.js';
import { countRatedWords, getMasteredByLevel } from './progress.js';
import { t, formatDate } from './i18n.js';

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
  return current > 0 ? t('stats.streakLink', { count: current }) : t('stats.link');
}

function renderStreak({ current, best }, hasStudiedToday) {
  document.getElementById('streak-current').textContent = daysText(current);
  document.getElementById('streak-best').textContent    = best;
  document.getElementById('streak-text').textContent    = streakMessage(current, hasStudiedToday);
}

function streakMessage(current, hasStudiedToday) {
  if (current === 0) return t('streak.start');
  if (!hasStudiedToday) return t('streak.keep');
  return t('streak.going');
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
  document.getElementById('chart-start').textContent = formatDay(days[0].date);
  selectDay(bars.at(-1), bars.at(-1).getAttribute('aria-label'));

  const reviewed   = sum(days.map(day => day.reviewed));
  const newWords   = sum(days.map(day => day.new));
  const activeDays = days.filter(day => day.reviewed > 0).length;
  document.getElementById('chart-summary').textContent = reviewed
    ? t('chart.summary', { cards: cardsText(reviewed), days: daysText(activeDays), count: newWords })
    : t('chart.empty');
}

function selectDay(column, detail) {
  document.querySelectorAll('.chart-day.selected').forEach(el => el.classList.remove('selected'));
  column.classList.add('selected');
  document.getElementById('chart-detail').textContent = detail;
}

function dayDetail(day, isToday) {
  const label = isToday ? t('stats.todayAxis') : formatDay(day.date);
  if (!day.reviewed) return t('chart.noCards', { label });
  return t('chart.day', { label, cards: cardsText(day.reviewed), count: day.new });
}

// '2026-10-21' → 'Oct 21' (or '21 oct.' in French)
function formatDay(key) {
  const [year, month, day] = key.split('-').map(Number);
  return formatDate(new Date(year, month - 1, day));
}

function cardsText(count) {
  return t('common.cards', { count });
}

function daysText(count) {
  return t('common.days', { count });
}

function sum(numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}
