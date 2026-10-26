// Service Worker Afrika Championships 2027 – nur für Push-Benachrichtigungen der Pinnwand
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

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
