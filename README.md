# HSK Flashcards

A clean, mobile-friendly flashcard app for practicing Chinese vocabulary across all 6 HSK levels.

**Live:** [hsk-flashcards.awounou.com](https://hsk-flashcards.awounou.com)

---

## Features

- **All 6 HSK levels** — 150 to 2,500 words per level (5,000 words total)
- **Combo mode** — mix multiple levels in a single session
- **Flexible word selection** — random, A→Z or Z→A by pinyin
- **Word range** — study words 25–50 from a sorted list, for example
- **Shuffle presentation** — pick words in order, review them in random order
- **Typing mode** — type the pinyin with tones (`nǐ hǎo` or `ni3 hao3`); the check suggests the rating, which you can still change
- **Phone and desktop layouts** — on phones, session options in a bottom sheet and settings on their own page (the back button closes them and asks before quitting a session); on desktop, a top navigation, options shown inline and a session side panel with progress and shortcuts
- **Guide** — explains every feature, with a search that ignores accents (`ni hao` finds `nǐ hǎo`) and highlights the results; small `?` buttons next to options open the matching topic
- **Mobile swipe gestures** — swipe right = got it, swipe left = review again
- **Keyboard shortcuts** — `Space` flip, `← →` navigate, `K` got it, `U` review again, `P` listen, `Z` undo
- **Undo** — revert the last ratings (button, `Z`, or from the results screen), progress included
- **Pronunciation** — 🔊 button using the device's Chinese voice (hidden when none is installed)
- **Tone colors** — pinyin and characters colored by tone on the back of the card
- **Dark mode** — System / Light / Dark, follows the system setting by default
- **Remembers your settings** — level, card mode, order, count and range are restored on the next visit, with a one-click reset to defaults (progress is kept)
- **Session results** — score, missed words, retry missed words only
- **Stats** — day streak (best streak too), cards rated today, words seen and mastered, and a 30-day chart of cards rated per day with the new words in each
- **Spaced repetition** — progress saved on the device (Leitner boxes: 1, 2, 4, 8, 16 days), daily review of due words, mastered words per level
- **Offline** — installable PWA, all levels available without a connection

## Stack

Pure HTML / CSS / JavaScript — no framework, no build step.  
Vocabulary data: [gigacool/hanyu-shuiping-kaoshi](https://github.com/gigacool/hanyu-shuiping-kaoshi) (MIT), copied into `data/` so the app works fully offline.

## Updating the vocabulary

The data is pinned to an upstream commit in `scripts/update-vocab.sh`.

1. Change `COMMIT` in the script (or keep it to re-download the same version)
2. Run `./scripts/update-vocab.sh`
3. Review the changes with `git diff data/`
4. Bump `VERSION` in `sw.js` so installed apps refresh their cache

## Local development

```bash
# Any static file server works — for example:
npx serve .
# or
python3 -m http.server 8080
```

Open `http://localhost:8080` (or the port shown).

> **Note:** ES modules require a server — opening `index.html` directly via `file://` will fail due to CORS restrictions.

## Tests

The app itself needs no install; `npm` is only used for the test tools.

```bash
npm install
npm test               # unit tests (Vitest): utils, spaced repetition, vocabulary data
npm run test:coverage  # same, with coverage (80% minimum)
npm run test:e2e       # browser tests (Playwright) against the real app
npm run test:all       # both
```

- **Unit tests** (`__tests__/unit/`) cover the pure logic: Leitner boxes and due dates, daily activity and streaks (with a fake clock),
  tone detection, translation cleaning, pinyin answer checking, guide search matching, and a check of all 5,000 words (unique ids, one syllable per
  character, no raw dictionary notation).
- **Browser tests** (`__tests__/e2e/`) drive the app like a user: sessions, undo, typing mode, the guide search, stats and streaks, spaced repetition over
  simulated days, remembered settings, theme, tone colors, pronunciation (with a fake voice) and offline mode.
- They use the installed Google Chrome. Without it, run `npx playwright install chromium` and
  `PW_CHANNEL=chromium npm run test:e2e`.
- GitHub Actions (`.github/workflows/tests.yml`) runs both suites on every push to `main` and every pull
  request. Traces of failed browser tests are attached to the run.

## Deployment (Vercel)

The project is a static site with no build step.

1. Push the repo to GitHub
2. Import on [vercel.com](https://vercel.com) — Vercel auto-detects it as a static site
3. Add custom domain `hsk.awounou.com` in Vercel → Settings → Domains
4. In Hostinger DNS add: `CNAME hsk → cname.vercel-dns.com`

`vercel.json` is already configured with cache and security headers.

## Project structure

```
index.html          Main markup
css/
  styles.css        Design system (Lumina HSK)
js/
  activity.js       Daily activity log (cards rated, new words, streaks) for the stats
  app.js            Orchestration, session start
  state.js          Shared state (cfg, session, cache)
  setup.js          Setup screen interactions
  flashcard.js      Card rendering, flip, swipe, keyboard
  guide.js          Guide search (filter and highlight)
  navigation.js     Back button handling for pages, sheet and sessions
  sheet.js          Bottom sheet (session options)
  results.js        Results screen
  speech.js         Pronunciation (Web Speech API)
  stats.js          Stats page (streak, totals, 30-day chart)
  theme.js          Light / dark theme preference
  progress.js       Spaced repetition (Leitner boxes) saved in localStorage
  utils.js          Data helpers (rawToWords, sortWords, shuffle), pinyin check, search
data/
  hsk-level-*.json  Vocabulary per level (generated by scripts/update-vocab.sh)
scripts/
  update-vocab.sh   Downloads the vocabulary from the upstream repo
sw.js               Service worker (offline support)
```

## License

MIT
