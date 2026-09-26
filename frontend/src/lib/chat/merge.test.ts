import { describe, expect, it } from 'vitest';
import { applyConversationEvent, applyPresence, mergeMessage, oldestId, prependOlder, removeMessage } from './merge';
import type { ChatMessageItem, ConversationSummary } from '@/types/chat.types';

const msg = (id: number, senderId = 3): ChatMessageItem => ({
  id,
  conversationId: 42,
  senderId,
  kind: 'text',
  body: `m${id}`,
  createdAt: new Date(2026, 8, 26, 10, id).toISOString(),
});

const thread = (id: number, unreadCount = 0, lastMessageAt = '2026-09-26T10:00:00Z'): ConversationSummary => ({
  id,
  other: { userId: 3, fullName: 'Cô Tư', role: 'farmer', image: null, online: false, lastSeenAt: null },
  lastMessageText: 'hi',
  lastMessageAt,
  unreadCount,
  createdAt: '2026-09-20T10:00:00Z',
});

describe('mergeMessage', () => {
  it('puts a new message at the end', () => {
    expect(mergeMessage([msg(1), msg(2)], msg(3)).map((m) => m.id)).toEqual([1, 2, 3]);
  });

  /**
   * Review Focus #1. REST returns the message in its response AND STOMP publishes that same message back to every
   * device of the sender (Plan 2 does this on purpose). Without deduping, the bubble shows twice.
   */
  it('ignores an event for a message already in the list', () => {
    const before = [msg(1), msg(2)];

    expect(mergeMessage(before, msg(2))).toBe(before);
  });

  it('keeps the list sorted by id even if an event arrives out of order', () => {
    expect(mergeMessage([msg(1), msg(3)], msg(2)).map((m) => m.id)).toEqual([1, 2, 3]);
  });

  it('does not mutate the list it was given', () => {
    const before = [msg(1)];

    mergeMessage(before, msg(2));

    expect(before.map((m) => m.id)).toEqual([1]);
  });

  it('starts a list that was empty', () => {
    expect(mergeMessage([], msg(5)).map((m) => m.id)).toEqual([5]);
  });
});

describe('prependOlder', () => {
  /** Review Focus #2: scrolling up to read old messages while a new message arrives. */
  it('keeps older pages when a new message arrives', () => {
    const withHistory = prependOlder([msg(10), msg(11)], [msg(9), msg(8), msg(7)]);

    const after = mergeMessage(withHistory, msg(12));

    expect(after.map((m) => m.id)).toEqual([7, 8, 9, 10, 11, 12]);
  });

  it('turns the newest-first page from the API into oldest-first', () => {
    expect(prependOlder([msg(10)], [msg(9), msg(8)]).map((m) => m.id)).toEqual([8, 9, 10]);
  });

  it('drops anything already in the list, so a repeated page cannot duplicate', () => {
    expect(prependOlder([msg(9), msg(10)], [msg(10), msg(9), msg(8)]).map((m) => m.id)).toEqual([8, 9, 10]);
  });

  it('returns the same array when the older page is empty', () => {
    const before = [msg(10)];

    expect(prependOlder(before, [])).toBe(before);
  });

  it('returns the same array when every message in the page is already there', () => {
    const before = [msg(9), msg(10)];

    expect(prependOlder(before, [msg(10), msg(9)])).toBe(before);
  });
});

describe('oldestId', () => {
  it('is the cursor for the next page back', () => {
    expect(oldestId([msg(8), msg(9)])).toBe(8);
  });

  it('is undefined for an empty list, so the first request sends no cursor', () => {
    expect(oldestId([])).toBeUndefined();
  });
});

describe('removeMessage', () => {
  it('drops the hidden message', () => {
    expect(removeMessage([msg(1), msg(2), msg(3)], 2).map((m) => m.id)).toEqual([1, 3]);
  });

  it('returns the same array when the message is not loaded', () => {
    const list = [msg(1)];
    expect(removeMessage(list, 9)).toBe(list);
  });
});

describe('applyConversationEvent', () => {
  it('moves the touched thread to the top and refreshes its preview', () => {
    const threads = [thread(1, 0, '2026-09-26T09:00:00Z'), thread(2, 0, '2026-09-26T08:00:00Z')];

    const after = applyConversationEvent(threads, {
      type: 'updated',
      conversationId: 2,
      lastMessageText: 'still fresh?',
      lastMessageAt: '2026-09-26T10:00:00Z',
      unreadCount: 3,
    });

    expect(after.map((t) => t.id)).toEqual([2, 1]);
    expect(after[0].lastMessageText).toBe('still fresh?');
    expect(after[0].unreadCount).toBe(3);
  });

  /**
   * The "read" event deliberately does NOT carry unreadCount (the backend uses a Long so it can be absent). The client
   * must not infer 0 from its absence — that was a bug found in Plan 2's smoke test.
   */
  it('leaves the badge alone when the event carries no count', () => {
    const after = applyConversationEvent([thread(1, 5)], { type: 'read', conversationId: 1, readerId: 9 });

    expect(after[0].unreadCount).toBe(5);
  });

  it('accepts a count of zero, which is different from a missing one', () => {
    const after = applyConversationEvent([thread(1, 5)], {
      type: 'updated',
      conversationId: 1,
      unreadCount: 0,
    });

    expect(after[0].unreadCount).toBe(0);
  });

  /**
   * The backend sends "read" to the sender when the other person reads: the list is sorted by the newest message,
   * reading is not a new message.
   */
  it('does not reorder the list for a read receipt', () => {
    const threads = [thread(1), thread(2)];

    expect(applyConversationEvent(threads, { type: 'read', conversationId: 2, readerId: 9 })).toBe(threads);
  });

  /** "hidden" (FR-116) is Plan 4B's job; in 4A it also must not bump the thread to the top. */
  it('does not reorder the list for a hidden message', () => {
    const threads = [thread(1), thread(2)];

    expect(applyConversationEvent(threads, { type: 'hidden', conversationId: 2, messageId: 5 })).toBe(threads);
  });

  it('ignores an event for a thread it has not loaded', () => {
    const threads = [thread(1)];

    expect(applyConversationEvent(threads, { type: 'updated', conversationId: 99 })).toBe(threads);
  });

  it('does not mutate the list it was given', () => {
    const threads = [thread(1, 0), thread(2, 0)];

    applyConversationEvent(threads, { type: 'updated', conversationId: 2, unreadCount: 4 });

    expect(threads.map((t) => t.id)).toEqual([1, 2]);
    expect(threads[1].unreadCount).toBe(0);
  });
});

/** /user/topic/presence: the other person going online / offline. Without it the online dot stays frozen from page load. */
describe('applyPresence', () => {
  it('updates the other person in every thread with them', () => {
    const after = applyPresence([thread(1), thread(2)], {
      userId: 3,
      online: true,
      lastSeenAt: '2026-09-26T10:05:00Z',
    });

    expect(after.map((t) => t.other.online)).toEqual([true, true]);
    expect(after[0].other.lastSeenAt).toBe('2026-09-26T10:05:00Z');
  });

  it('returns the same array when nobody in the list changed', () => {
    const threads = [thread(1)];

    expect(applyPresence(threads, { userId: 99, online: true, lastSeenAt: null })).toBe(threads);
  });

  it('does not mutate the list it was given', () => {
    const threads = [thread(1)];

    applyPresence(threads, { userId: 3, online: true, lastSeenAt: null });

    expect(threads[0].other.online).toBe(false);
  });
});
