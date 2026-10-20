/* Meraki service worker — receives push notifications even when the app is closed. */
const PAGE = new URL(self.location.href).searchParams.get('page') || '/';
self.addEventListener('install', () => self.skipWaiting());

// ---- App-shell cache: opens instantly and still opens with no internet. Pages are always fetched fresh first. ----
const SHELL = 'meraki-shell-v1';
const LIBS = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|cdn\.tailwindcss\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  try { const keys = await caches.keys(); await Promise.all(keys.filter((k) => k.startsWith('meraki-shell-') && k !== SHELL).map((k) => caches.delete(k))); } catch (err) {}
  await self.clients.claim();
})()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url; try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/sw.js')) return;
    // our own pages and images: network first, saved copy only when offline
    event.respondWith(fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(async () => (await caches.match(req)) || (req.mode === 'navigate' ? await caches.match(self.registration.scope) : undefined) || Response.error()));
  } else if (LIBS.test(req.url)) {
    // libraries and fonts: show the saved copy straight away, refresh it in the background
    event.respondWith(caches.open(SHELL).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()).catch(() => {}); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: 'Meraki', body: event.data ? event.data.text() : '' }; }
  const opts = {
    body: d.body || '',
    icon: 'icon-192.png',      // large picture shown on the right of the notification
    badge: 'badge-96.png',     // small monochrome icon in the status bar
    tag: d.tag || undefined,
    timestamp: Date.now(),
    vibrate: [120, 60, 120],
    data: { url: d.url || '#/home' },
  };
  if (d.image) opts.image = d.image; // big banner picture under the text
  if (d.cta) opts.actions = [{ action: 'open', title: d.cta }];
  event.waitUntil(self.registration.showNotification(d.title || 'Meraki', opts));
});

// Remember what happened on the last tap so the app can show it (helps pin down "tap didn't open the app").
const note = (result, err) => caches.open('meraki-diag')
  .then((c) => c.put('last-tap', new Response(JSON.stringify({ t: Date.now(), result, err: err ? String(err).slice(0, 80) : '' }))))
  .catch(() => {});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const hash = (event.notification.data && event.notification.data.url) || '#/home';
  // Use the service-worker scope (the site root) as the base: it is always inside the installed app's scope.
  const root = self.registration.scope;
  // owner alerts open the separately-installed Admin app; everything else opens the store
  const isAdminLink = hash.startsWith('#/admin');
  const target = root + (isAdminLink ? 'admin/' : '') + hash;
  const inAdmin = (u) => { try { return new URL(u).pathname.startsWith('/admin'); } catch (e) { return false; } };
  const inDelivery = (u) => { try { return new URL(u).pathname.startsWith('/delivery'); } catch (e) { return false; } };
  event.waitUntil((async () => {
    let wins = [];
    try { wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); } catch (e) {}
    const mine = wins.find((c) => { try { return new URL(c.url).origin === self.location.origin && !inDelivery(c.url) && (isAdminLink ? inAdmin(c.url) : !inAdmin(c.url)); } catch (e) { return false; } });
    if (mine) {
      try { if ('focus' in mine) await mine.focus(); } catch (e) {}
      mine.postMessage({ type: 'navigate', url: hash });
      await note('focused open app');
      return;
    }
    // App is closed: open it on the right screen; fall back to the plain app root if that is refused.
    try { await self.clients.openWindow(target); await note('opened app'); return; }
    catch (e1) {
      try { await self.clients.openWindow(root); await note('opened app root (page link refused)', e1); }
      catch (e2) { await note('could not open app', e2); }
    }
  })());
});
