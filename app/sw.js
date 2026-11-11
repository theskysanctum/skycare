const CACHE = 'taking-care-1523a45f6424';
const FILES = ["./","app.js","fonts/LICENSE-Atkinson.txt","fonts/LICENSE-OpenDyslexic.txt","fonts/atkinson-hyperlegible-latin-400-normal.woff2","fonts/atkinson-hyperlegible-latin-700-normal.woff2","fonts/opendyslexic-latin-400-normal.woff2","fonts/opendyslexic-latin-700-normal.woff2","icon-192.png","icon-512.png","icon-maskable-512.png","img/bear.jpg","img/cover.jpg","img/end.jpg","img/s1.jpg","img/s2.jpg","img/s3.jpg","img/s4.jpg","img/s5.jpg","img/s6.jpg","index.html","manifest.webmanifest","style.css"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then((c) => c.match(r, { ignoreSearch: true }).then((hit) => {
    const net = fetch(r).then((res) => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
self.addEventListener('notificationclick', (e) => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => cs.length ? cs[0].focus() : self.clients.openWindow('./'))); });
