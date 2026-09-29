import type { NotificationFrame, NotificationKindCode } from '@/types/notification.types';

export const FARMER_DECISION_KINDS: NotificationKindCode[] = [
  'farmer_approved',
  'farmer_rejected',
  'farmer_suspended',
  'farmer_reinstated',
];

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
