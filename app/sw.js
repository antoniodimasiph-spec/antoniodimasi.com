// Set Builder installed as an app: works offline, and still gets every Sunday update.
// The app page is fetched from the network first (fresh version), the saved copy is used only when offline.
const CACHE = 'setbuilder-v1';
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', '/counters.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const save = (req, res) => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && (req.mode === 'navigate' || url.pathname.startsWith('/app/') || url.pathname === '/counters.js')) {
    e.respondWith(fetch(req).then(res => res.ok ? save(req, res) : res).catch(() => caches.match(req).then(r => r || caches.match('./'))));
    return;
  }
  // sql.js (reads Engine DJ libraries): downloaded once, then available offline too
  if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/sql.js@')) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => res.ok ? save(req, res) : res)));
  }
});
