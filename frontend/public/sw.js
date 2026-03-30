const CACHE_NAME = 'photohub-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    // Strategy: Cache-first for static, network-first for others (simplified)
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
