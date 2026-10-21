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
- **Sounds and vibration** — short game-like sounds when flipping, rating, mastering a word and finishing a session, light vibrations on Android; can be turned off
- **English and French** — the interface and the guide follow the device language, with a choice in Settings; in French, the cards show French meanings too
- **Dark mode** — System / Light / Dark, follows the system setting by default
- **Remembers your settings** — level, card mode, order, count and range are restored on the next visit, with a one-click reset to defaults (progress is kept)
- **Session results** — score, missed words, retry missed words only
- **Stats** — day streak (best streak too), cards rated today, words seen and mastered, and a 30-day chart of cards rated per day with the new words in each
- **Backup** — export progress and stats to a file and import it on another device or browser
- **Spaced repetition** — progress saved on the device (Leitner boxes: 1, 2, 4, 8, 16 days), daily review of due words, mastered words per level
- **Offline** — installable PWA, all levels available without a connection

## Stack

Pure HTML / CSS / JavaScript — no framework, no build step.  
Vocabulary data: [gigacool/hanyu-shuiping-kaoshi](https://github.com/gigacool/hanyu-shuiping-kaoshi) (MIT), copied into `data/` so the app works fully offline.  
French meanings: [CFDICT](https://chine.in/mandarin/dictionnaire/CFDICT/) by Chine Informations ([CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)), built into `data/fr/` with a few additions and fixes.  
Sounds: [Kenney Interface Sounds and Digital Audio](https://kenney.nl) (CC0), converted to mono MP3 in `sounds/`.

## Updating the vocabulary

The data is pinned to an upstream commit in `scripts/update-vocab.sh`.

1. Change `COMMIT` in the script (or keep it to re-download the same version)
2. Run `./scripts/update-vocab.sh`
3. Review the changes with `git diff data/`
4. Bump `VERSION` in `sw.js` so installed apps refresh their cache

The French meanings are built from the latest CFDICT, plus the hand-written meanings in
`FRENCH_FIXES` for the words it lacks or gets wrong:

1. Run `node scripts/update-french.mjs` (or pass the path of a downloaded `cfdict.u8`)
2. Review the changes with `git diff data/fr/`; the script lists any word left without a French meaning
3. Bump `VERSION` in `sw.js`

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
  backup files (export, rejected files, invalid entries skipped on import),
  translations (device language, plural forms, every text and guide topic present in both languages),
  the French meanings (CFDICT matching, slang filtered out, a meaning for every HSK word),
  tone detection, translation cleaning, pinyin answer checking, guide search matching, and a check of all 5,000 words (unique ids, one syllable per
  character, no raw dictionary notation).
- **Browser tests** (`__tests__/e2e/`) drive the app like a user: sessions, undo, typing mode, the guide search, stats and streaks, backup export and import, the French interface and the language setting, sounds and vibrations (with a fake audio output), spaced repetition over
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
  backup.js         Progress and stats backup file (export, check, restore)
  state.js          Shared state (cfg, session, cache)
  setup.js          Setup screen interactions
  flashcard.js      Card rendering, flip, swipe, keyboard
  guide.js          Guide in the current language, search (filter and highlight)
  i18n.js           Interface language (auto / English / French), translations
  locales/          French texts, and the English ones written by the scripts
  navigation.js     Back button handling for pages, sheet and sessions
  sheet.js          Bottom sheet (session options)
  sound.js          Sounds (Web Audio) and vibrations, on/off preference
  results.js        Results screen
  speech.js         Pronunciation (Web Speech API)
  stats.js          Stats page (streak, totals, 30-day chart)
  theme.js          Light / dark theme preference
  progress.js       Spaced repetition (Leitner boxes) saved in localStorage
  utils.js          Data helpers (rawToWords, sortWords, shuffle), pinyin check, search
data/
  hsk-level-*.json  Vocabulary per level (generated by scripts/update-vocab.sh)
  fr/               French meanings by word id (generated by scripts/update-french.mjs, CC BY-SA)
sounds/
  *.mp3             Game sounds (Kenney, CC0), one per event: flip, known, mastered…
scripts/
  update-vocab.sh   Downloads the vocabulary from the upstream repo
  update-french.mjs Builds the French meanings from CFDICT
sw.js               Service worker (offline support)
```

## License

MIT for the code. The French meanings in `data/fr/` are under CC BY-SA 3.0, like CFDICT (see `data/fr/LICENSE`).
