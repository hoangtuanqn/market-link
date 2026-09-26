import type { ChatMessageItem, ConversationEventFrame, ConversationSummary, PresenceFrame } from '@/types/chat.types';

/**
 * In state, the message list is sorted **oldest → newest** (read top to bottom like the screen). The API returns newest
 * → oldest, so prependOlder reverses it.
 *
 * Every function here is pure: returns a new array, never edits the input array, and returns the **exact same array**
 * when nothing changed — React compares by reference so that skips a wasted render entirely.
 */

const byId = (a: ChatMessageItem, b: ChatMessageItem) => a.id - b.id;

/**
 * My own message arrives by two paths: the REST response, then a STOMP event (Plan 2 deliberately publishes it to every
 * device of the sender). Deduping by id is what keeps the bubble showing only once.
 */
export function mergeMessage(list: ChatMessageItem[], incoming: ChatMessageItem): ChatMessageItem[] {
  if (list.some((m) => m.id === incoming.id)) return list;

  const last = list[list.length - 1];
  // The common path: the newest message, just append it to the end
  if (!last || incoming.id > last.id) return [...list, incoming];
  // An event arriving out of order when the network is flaky
  return [...list, incoming].sort(byId);
}

/** A history page from the API (newest → oldest) is merged into the front of the list, dropping ones already held. */
export function prependOlder(list: ChatMessageItem[], older: ChatMessageItem[]): ChatMessageItem[] {
  if (older.length === 0) return list;

  const have = new Set(list.map((m) => m.id));
  const fresh = older.filter((m) => !have.has(m.id));
  if (fresh.length === 0) return list;

  return [...fresh, ...list].sort(byId);
}

/** The keyset cursor for the next history page. */
export function oldestId(list: ChatMessageItem[]): number | undefined {
  return list.length === 0 ? undefined : list[0].id;
}

/**
 * A thread with a new message ("updated") jumps to the top of the list. "read" and "hidden" are not new messages so
 * they must not change the order: the list is sorted by the last message.
 *
 * The "read" event deliberately carries no unreadCount (the backend uses a Long type so it can be absent). Use `??`,
 * not `||`: do not infer 0 from its absence, but a real 0 sent must be accepted. That bug was caught in Plan 2's smoke
 * test.
 */
export function applyConversationEvent(
  threads: ConversationSummary[],
  frame: ConversationEventFrame,
): ConversationSummary[] {
  if (frame.type !== 'updated') return threads;
  const at = threads.findIndex((t) => t.id === frame.conversationId);
  if (at === -1) return threads;

  const touched: ConversationSummary = {
    ...threads[at],
    lastMessageText: frame.lastMessageText ?? threads[at].lastMessageText,
    lastMessageAt: frame.lastMessageAt ?? threads[at].lastMessageAt,
    unreadCount: frame.unreadCount ?? threads[at].unreadCount,
  };
  return [touched, ...threads.slice(0, at), ...threads.slice(at + 1)];
}

/** The other person going online / offline: updates every thread with them, keeping the order unchanged. */
export function applyPresence(threads: ConversationSummary[], frame: PresenceFrame): ConversationSummary[] {
  if (!threads.some((t) => t.other.userId === frame.userId)) return threads;

  return threads.map((t) =>
    t.other.userId === frame.userId
      ? { ...t, other: { ...t.other, online: frame.online, lastSeenAt: frame.lastSeenAt } }
      : t,
  );
}

/** Admin ẩn một tin (FR-116): bỏ nó khỏi thread đang mở. Không có thì trả đúng mảng cũ. */
export function removeMessage(list: ChatMessageItem[], messageId: number): ChatMessageItem[] {
  return list.some((m) => m.id === messageId) ? list.filter((m) => m.id !== messageId) : list;
}
