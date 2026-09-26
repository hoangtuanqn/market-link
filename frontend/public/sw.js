// MarketLink service worker (FR-042). N2: hiện và mở thông báo khi tab ẩn; N3 thêm sự kiện 'push' (Web Push).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

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
