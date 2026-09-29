import type { ChatMessageItem, ConversationEventFrame, ConversationSummary, PresenceFrame } from '@/types/chat.types';

const byId = (a: ChatMessageItem, b: ChatMessageItem) => a.id - b.id;

export function mergeMessage(list: ChatMessageItem[], incoming: ChatMessageItem): ChatMessageItem[] {
  if (list.some((m) => m.id === incoming.id)) return list;

  const last = list[list.length - 1];
  if (!last || incoming.id > last.id) return [...list, incoming];
  return [...list, incoming].sort(byId);
}

export function prependOlder(list: ChatMessageItem[], older: ChatMessageItem[]): ChatMessageItem[] {
  if (older.length === 0) return list;

  const have = new Set(list.map((m) => m.id));
  const fresh = older.filter((m) => !have.has(m.id));
  if (fresh.length === 0) return list;

  return [...fresh, ...list].sort(byId);
}

export function oldestId(list: ChatMessageItem[]): number | undefined {
  return list.length === 0 ? undefined : list[0].id;
}

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

export function applyPresence(threads: ConversationSummary[], frame: PresenceFrame): ConversationSummary[] {
  if (!threads.some((t) => t.other.userId === frame.userId)) return threads;

  return threads.map((t) =>
    t.other.userId === frame.userId
      ? { ...t, other: { ...t.other, online: frame.online, lastSeenAt: frame.lastSeenAt } }
      : t,
  );
}

export function removeMessage(list: ChatMessageItem[], messageId: number): ChatMessageItem[] {
  return list.some((m) => m.id === messageId) ? list.filter((m) => m.id !== messageId) : list;
}
