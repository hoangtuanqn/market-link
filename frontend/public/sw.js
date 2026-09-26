// MarketLink service worker (FR-042). N2: mở thông báo khi bấm; N3: nhận Web Push khi đã đóng hết tab.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Nội dung do backend (WebPushSender) mã hoá: { kind, title, message, link, tag }
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'MarketLink', message: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'MarketLink', {
      body: data.message || '',
      tag: data.tag,
      data: { link: data.link || '/' },
      icon: '/favicon.ico',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/';
  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const tab = tabs.find((c) => new URL(c.url).origin === self.location.origin);
      if (tab) {
        await tab.focus();
        tab.postMessage({ type: 'notification-open', link });
        return;
      }
      await self.clients.openWindow(link);
    })(),
  );
});
