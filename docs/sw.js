var CACHE_NAME = 'react-tetris-shell-v3';
var CACHE_PREFIX = 'react-tetris-shell-';
var LEGACY_CACHE_PREFIX = 'tetris-v';
var STATIC_ASSETS = [
  './',
  './index.html',
  './app-1.0.1.js',
  './css-1.0.1.css',
  './loader.css',
  './music.mp3',
  './icon.png',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if ((key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME) ||
            key.indexOf(LEGACY_CACHE_PREFIX) === 0) {
          return caches.delete(key);
        }
        return null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET' ||
      new URL(event.request.url).origin !== self.location.origin) {
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.open(CACHE_NAME).then(function (cache) {
          return cache.match('./index.html');
        });
      })
    );
    return;
  }
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(event.request);
    }).then(function (response) {
      return response || fetch(event.request);
    })
  );
});
