/* Meraki service worker — receives push notifications even when the app is closed. */
const PAGE = new URL(self.location.href).searchParams.get('page') || '/';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

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
  const target = root + hash;
  event.waitUntil((async () => {
    let wins = [];
    try { wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); } catch (e) {}
    const mine = wins.find((c) => { try { return new URL(c.url).origin === self.location.origin; } catch (e) { return false; } });
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
