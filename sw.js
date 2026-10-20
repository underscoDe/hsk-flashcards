const VERSION = 'v6'; // bump on every data update (scripts/update-vocab.sh)
const STATIC_CACHE = `hsk-static-${VERSION}`;
const DATA_CACHE   = `hsk-data-${VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/flashcard.js',
  '/js/progress.js',
  '/js/results.js',
  '/js/setup.js',
  '/js/speech.js',
  '/js/state.js',
  '/js/theme.js',
  '/js/utils.js',
  '/manifest.json',
];

const DATA_ASSETS = [1, 2, 3, 4, 5, 6].map(level => `/data/hsk-level-${level}.json`);

// cache: 'reload' bypasses the HTTP cache so we never pre-cache stale files
function precache(cacheName, urls) {
  return caches.open(cacheName).then(c =>
    c.addAll(urls.map(url => new Request(url, { cache: 'reload' })))
  );
}

// Install: pre-cache shell assets and every level, so the app works fully offline
self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    precache(STATIC_CACHE, STATIC_ASSETS),
    precache(DATA_CACHE, DATA_ASSETS),
  ]));
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Vocabulary JSON — cache-first; only changes when VERSION is bumped
  if (url.origin === self.location.origin && url.pathname.startsWith('/data/')) {
    e.respondWith(
      caches.open(DATA_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Google Fonts — network-first (skip caching to avoid CORS issues)
  if (url.hostname.includes('fonts.')) return;

  // Shell assets — network-first so updates reach users, cache as offline fallback
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then(c => c.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
