// Makes Bubble installable and shows the helplines page when there's no
// connection. It deliberately caches nothing else: the app and the API always
// come from the network, so a deploy is never hidden behind an old copy.
const CACHE = 'bubble-offline-v1';
const OFFLINE_FILES = ['/offline.html', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  // Only page loads fall back; everything else behaves as if there were no worker
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
});
