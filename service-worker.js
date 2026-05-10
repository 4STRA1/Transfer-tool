const CACHE_NAME = 'image-converter-v1';

const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* インストール */
self.addEventListener('install', event => {
  
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  
});

/* キャッシュ取得 */
self.addEventListener('fetch', event => {
  
  event.respondWith(
    caches.match(event.request)
    .then(response => {
      return response || fetch(event.request);
    })
  );
  
});

/* 古いキャッシュ削除 */
self.addEventListener('activate', event => {
  
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
      );
    })
  );
  
});