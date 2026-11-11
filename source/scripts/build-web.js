const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const out = process.argv[2];
if (!out) { console.error('usage: node scripts/build-web.js <output dir>'); process.exit(1); }
cp.execSync('npm run bundle', { stdio: 'inherit' });
const www = path.join(__dirname, '..', 'www');
const walk = (d, base = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name), base + e.name + '/') : [base + e.name]);
const files = walk(www).filter((f) => f !== 'sw.js');
const h = crypto.createHash('sha256');
files.sort().forEach((f) => { h.update(f); h.update(fs.readFileSync(path.join(www, f))); });
const version = h.digest('hex').slice(0, 12);
const sw = `const CACHE = 'skycare-${version}';
const FILES = ${JSON.stringify(['./'].concat(files))};
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
`;
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(www, out, { recursive: true });
fs.writeFileSync(path.join(out, 'sw.js'), sw);
console.log('built', out, 'version', version, files.length, 'files');
