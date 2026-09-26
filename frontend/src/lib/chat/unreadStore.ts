let unread = 0;
const subscribers = new Set<() => void>();

export const ChatUnreadStore = {
  getUnread: () => unread,
  setUnread: (n: number) => {
    const next = Math.max(0, n);
    if (next !== unread) {
      unread = next;
      subscribers.forEach((cb) => cb());
      window.dispatchEvent(new CustomEvent('chat-unread', { detail: unread }));
    }
  },
  subscribe: (cb: () => void) => {
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  },
};
