// Simple offline cache for Song Scroll (GitHub Pages)
const CACHE = "song-scroll-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./songs.txt",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Cache strategy:
// - songs.txt: network-first so updates appear after you deploy
// - other assets: cache-first
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isSongs = url.pathname.endsWith("/songs.txt") || url.pathname.endsWith("songs.txt");

  if (isSongs) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
