const CACHE='italy-trip-v9';const ASSETS=['./','index.html','styles.css','app.js','data.json','manifest.webmanifest','config.js','drive-sync.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
