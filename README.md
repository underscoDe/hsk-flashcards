# HSK Flashcards

A clean, mobile-friendly flashcard app for practicing Chinese vocabulary across all 6 HSK levels.

**Live:** [hsk.awounou.com](https://hsk-flashcards.awounou.com)

---

## Features

- **All 6 HSK levels** — 150 to 601 words per level (2,385 words total)
- **Combo mode** — mix multiple levels in a single session
- **Flexible word selection** — random, A→Z or Z→A by pinyin
- **Word range** — study words 25–50 from a sorted list, for example
- **Shuffle presentation** — pick words in order, review them in random order
- **Mobile swipe gestures** — swipe right = got it, swipe left = review again
- **Keyboard shortcuts** — `Space` flip, `← →` navigate, `K` got it, `U` review again
- **Session results** — score, missed words, retry missed words only

## Stack

Pure HTML / CSS / JavaScript — no framework, no build step.  
Vocabulary data: [gigacool/hanyu-shuiping-kaoshi](https://github.com/gigacool/hanyu-shuiping-kaoshi)

## Local development

```bash
# Any static file server works — for example:
npx serve .
# or
python3 -m http.server 8080
```

Open `http://localhost:8080` (or the port shown).

> **Note:** ES modules require a server — opening `index.html` directly via `file://` will fail due to CORS restrictions.

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
  app.js            Orchestration, session start
  state.js          Shared state (cfg, session, cache)
  setup.js          Setup screen interactions
  flashcard.js      Card rendering, flip, swipe, keyboard
  results.js        Results screen
  utils.js          Data helpers (rawToWords, sortWords, shuffle)
```

## License

MIT
