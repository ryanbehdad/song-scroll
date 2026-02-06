/* Simple offline-first Service Worker for Song Scroll (GitHub Pages friendly)
   Strategy:
   - Navigations: network-first, fallback to cached index.html
   - Assets (incl. songs.txt): stale-while-revalidate (fast, but still updates in background)
*/

const CACHE = 'song-scroll-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './songs.txt',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req).then((res) => {
    // only cache successful same-origin GETs
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);

  return cached || (await fetchPromise) || new Response('Offline', { status: 503 });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(async () => {
        const cache = await caches.open(CACHE);
        return cache.match('./index.html') || cache.match('./');
      })
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(req));
});
