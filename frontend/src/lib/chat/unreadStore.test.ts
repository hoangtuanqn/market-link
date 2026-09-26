import { describe, expect, it, vi } from 'vitest';
import { ChatUnreadStore } from './unreadStore';

describe('ChatUnreadStore', () => {
  it('tells subscribers when the count changes, and only then', () => {
    const cb = vi.fn();
    const off = ChatUnreadStore.subscribe(cb);
    ChatUnreadStore.setUnread(3);
    ChatUnreadStore.setUnread(3);
    off();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(ChatUnreadStore.getUnread()).toBe(3);
  });

  it('never goes below zero', () => {
    ChatUnreadStore.setUnread(-2);
    expect(ChatUnreadStore.getUnread()).toBe(0);
  });
});
