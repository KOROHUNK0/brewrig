const CACHE_NAME = 'brewrig-v1';
const ASSETS = [
  './coffee-drip-timer.html',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/favicon.svg',
  './assets/submit-button-click2.mp3',
];

// インストール: 全アセットをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// アクティベート: 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// フェッチ: キャッシュ優先、なければネットワーク
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => {
        // オフライン時にHTMLリクエストにはメインページを返す
        if (event.request.destination === 'document') {
          return caches.match('./coffee-drip-timer.html');
        }
      });
    })
  );
});
