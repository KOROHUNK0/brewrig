// BrewRig service worker.
//
// __BUILD_ID__ is replaced at build time (vite.config.ts `swBuildId`) with a
// hash of dist/, so this file's bytes change on every deploy and browsers
// pick up the new worker.
//
// The cache name includes the registration scope so the production SW
// (/brewrig/) and the preview SW (/brewrig/preview/) never delete each
// other's caches — Cache Storage is shared per origin.
const BUILD_ID = '__BUILD_ID__';
const CACHE_PREFIX = `brewrig:${self.registration.scope}:`;
const CACHE_NAME = CACHE_PREFIX + BUILD_ID;
// Pre-2026-10 cache (its install always failed; removed if present).
const LEGACY_CACHES = ['brewrig-v3'];
const NAV_TIMEOUT_MS = 4000;

// Every entry must exist in dist/: cache.addAll rejects (and the whole
// install fails) if a single request 404s.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './credits.html',
  './assets/favicon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-padding-192.png',
  './assets/icon-padding-512.png',
  './assets/icon-padding.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k =>
            (k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME) ||
            LEGACY_CACHES.includes(k)
          )
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// HTML: network-first so an online launch always gets the latest build;
// falls back to the cache when offline or the network stalls.
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const fromNetwork = fetch(request).then(res => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  });
  // Avoid an unhandled rejection if the timeout wins and the fetch fails later.
  fromNetwork.catch(() => {});
  const timeout = new Promise(resolve =>
    setTimeout(() => resolve(null), NAV_TIMEOUT_MS)
  );
  try {
    const res = await Promise.race([fromNetwork, timeout]);
    if (res) return res;
  } catch (e) {
    // offline — fall through to the cache
  }
  const cached =
    (await cache.match(request, { ignoreSearch: true })) ||
    (await cache.match('./index.html'));
  // Nothing cached yet: keep waiting on the network (may still reject).
  return cached || fromNetwork;
}

// Other same-origin assets: cache-first.
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  // Cross-origin (Google Fonts etc.) is left to the browser.
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    request.mode === 'navigate' ? networkFirst(request) : cacheFirst(request)
  );
});
