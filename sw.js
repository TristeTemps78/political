// Service worker : cache-first du shell applicatif (PWA hors ligne).
// Ne met JAMAIS en cache autre chose que les fichiers statiques du shell.

const CACHE = 'politiquest-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/store.js',
  './js/data.js',
  './js/adapter.js',
  './js/affinity.js',
  './js/quiz.js',
  './js/map.js',
  './js/guilds.js',
  './js/hemicycle.js',
  './js/graph.js',
  './js/predictions.js',
  './js/duels.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
