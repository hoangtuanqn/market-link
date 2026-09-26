import type { NotificationFrame } from '@/types/notification.types';

/** Số chưa đọc (chuông ở cả ba khu) và các khung mới cho trang danh sách. Dùng với useSyncExternalStore. */
const CHANGE = 'notifications-unread';

let unread = 0;
const frameListeners = new Set<(f: NotificationFrame) => void>();

export const NotificationStore = {
  getUnread: () => unread,

  setUnread(n: number) {
    const next = Math.max(0, n);
    if (next === unread) return;
    unread = next;
    window.dispatchEvent(new Event(CHANGE));
  },

  subscribe(callback: () => void) {
    window.addEventListener(CHANGE, callback);
    return () => window.removeEventListener(CHANGE, callback);
  },

  onFrame(listener: (f: NotificationFrame) => void) {
    frameListeners.add(listener);
    return () => {
      frameListeners.delete(listener);
    };
  },

  emitFrame(frame: NotificationFrame) {
    frameListeners.forEach((l) => l(frame));
  },
};
