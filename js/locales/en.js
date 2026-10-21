// English texts written by the scripts; the other English texts are in index.html
// (see js/i18n.js). A text with plural forms is { one, other }.

export const EN = {
  'common.words': { one: '{count} word', other: '{count} words' },
  'common.cards': { one: '{count} card', other: '{count} cards' },
  'common.days':  { one: '{count} day', other: '{count} days' },

  'summary.shuffled': ', shuffled',
  'summary.range':    'Words {from}–{to}',
  'summary.all':      'All words',
  'range.invalid':    '"From" must be less than or equal to "To".',
  'range.selected':   'Words {from}–{to} selected ({words}). Count above is overridden.',

  'review.due':      { one: '{count} word to review today', other: '{count} words to review today' },
  'review.tomorrow': '✓ All caught up — next review tomorrow',
  'review.inDays':   '✓ All caught up — next review in {count} days',
  'level.mastered':  '{count}/{total} mastered',

  'stats.link':       'See your stats ›',
  'stats.streakLink': '🔥 {count}-day streak · Stats ›',
  'streak.start':     'Rate a card today to start a streak',
  'streak.keep':      'Rate a card today to keep it going',
  'streak.going':     'Current streak, keep it up!',
  'chart.summary':    '{cards} over {days}, {count} of them new words.',
  'chart.empty':      'No cards rated in the last 30 days yet.',
  'chart.day':        '{label}: {cards}, {count} new',
  'chart.noCards':    '{label}: no cards',

  'results.daily':    'Daily review',
  'results.combo':    'Combo — HSK {levels}',
  'results.perfect':  'Perfect, excellent work!',
  'results.great':    'Great job!',
  'results.good':     'Good, keep it up!',
  'results.practice': 'Keep practicing!',
  'results.sub':      { one: '{count} word reviewed — {label}', other: '{count} words reviewed — {label}' },
  'results.promoted': {
    one:   '📈 {count} word moved to a longer review interval',
    other: '📈 {count} words moved to a longer review interval',
  },

  'session.next':     'Next →',
  'session.finish':   'Finish ✓',
  'badge.review':     '✗ Review',
  'feedback.correct': '✓ Correct',
  'feedback.tones':   '✗ Right syllables, wrong tones',
  'feedback.wrong':   '✗ Not quite',

  'guide.found': { one: '{count} topic found', other: '{count} topics found' },

  'error.loadTitle':     'Couldn’t load the words',
  'error.loadBody':      'Please check your internet connection and try again.',
  'backup.notTitle':     'Not a backup file',
  'backup.notBody':      'Choose a file saved with Export progress in this app.',
  'backup.confirm':      'This backup from {date} has {words}. It replaces the progress and stats on this device.',
  'backup.confirmNoDate': 'This backup has {words}. It replaces the progress and stats on this device.',
  'backup.doneTitle':    'Progress imported',
  'backup.doneBody':     '{words} and your stats are back.',
};
