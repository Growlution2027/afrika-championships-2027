// Service Worker Afrika Championships 2027
// Offline: Seite und Daten zuerst aus dem Netz, sonst letzter gespeicherter Stand.
// Bilder aus dem Speicher, im Hintergrund aktualisiert. Musik wird nicht gespeichert.
// Push: Benachrichtigungen der Pinnwand.
const VERSION = '1d08f434';
const CACHE = 'ac27-' + VERSION;
const SHELL = ["./", "index.html", "data.json", "manifest.webmanifest", "apple-touch-icon.png", "icon-512.png", "favicon-32.png", "hits-cover.jpg", "lageplan.jpg", "img-av_chau.jpg", "img-av_dirk.jpg", "img-av_georg.jpg", "img-av_klemens.jpg", "img-av_markus.jpg", "img-av_maurizio.jpg", "img-av_peter.jpg", "img-av_reinhold.jpg", "img-av_volker.jpg", "img-card_chau.jpg", "img-card_dirk.jpg", "img-card_georg.jpg", "img-card_klemens.jpg", "img-card_markus.jpg", "img-card_maurizio.jpg", "img-card_peter.jpg", "img-card_reinhold.jpg", "img-card_volker.jpg", "img-hero.jpg", "platz-acacias.jpg", "platz-lamer.jpg", "platz-palmiers.jpg", "galerie-1-s.webp", "galerie-10-s.webp", "galerie-11-s.webp", "galerie-12-s.webp", "galerie-13-s.webp", "galerie-14-s.webp", "galerie-15-s.webp", "galerie-16-s.webp", "galerie-17-s.webp", "galerie-2-s.webp", "galerie-3-s.webp", "galerie-4-s.webp", "galerie-5-s.webp", "galerie-6-s.webp", "galerie-7-s.webp", "galerie-8-s.webp", "galerie-9-s.webp"];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('ac27-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const timeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); }); });

async function networkFirst(req, key) {
  const c = await caches.open(CACHE);
  try {
    const r = await timeout(fetch(req, { cache: 'no-store' }), 6000);
    if (r && r.ok) c.put(key, r.clone());
    return r;
  } catch (e) {
    const hit = await c.match(key, { ignoreSearch: true });
    if (hit) return hit;
    throw e;
  }
}

async function staleWhileRevalidate(req, ev) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req, { ignoreSearch: true });
  const net = fetch(req).then(r => { if (r && r.ok && r.type === 'basic') c.put(req, r.clone()); return r; }).catch(() => null);
  if (hit) { ev.waitUntil(net); return hit; }
  const r = await net;
  return r || new Response('', { status: 504 });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // Supabase u. a. nicht anfassen
  if (/\.mp3$/i.test(url.pathname)) return;                   // Musik direkt aus dem Netz
  const scope = new URL(self.registration.scope);
  if (req.mode === 'navigate' || url.pathname === scope.pathname || url.pathname.endsWith('/index.html')) {
    e.respondWith(networkFirst(req, new URL('index.html', scope).href));
    return;
  }
  if (url.pathname.endsWith('/data.json')) {
    e.respondWith(networkFirst(req, new URL('data.json', scope).href));
    return;
  }
  e.respondWith(staleWhileRevalidate(req, e));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'Afrika Championships · Pinnwand';
  e.waitUntil(Promise.all([
    self.registration.showNotification(title, {
      body: d.body || 'Neue Mitteilung auf der Pinnwand',
      icon: 'apple-touch-icon.png',
      badge: 'favicon-32.png',
      tag: 'pw-' + (d.id || Date.now()),
      data: { url: d.url || './#pinnwand' }
    }),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => list.forEach(c => c.postMessage({ type: 'pw-new' })))
  ]));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './#pinnwand';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if ('focus' in c) { c.postMessage({ type: 'pw' }); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
