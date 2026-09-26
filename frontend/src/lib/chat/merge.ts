import type { ChatMessageItem, ConversationEventFrame, ConversationSummary } from '@/types/chat.types';

/**
 * Trong state, danh sách tin xếp **cũ → mới** (đọc từ trên xuống như trên màn hình). API trả mới → cũ, nên prependOlder
 * đảo lại.
 *
 * Mọi hàm ở đây thuần: trả mảng mới, không sửa mảng đầu vào, và trả **đúng mảng cũ** khi không có gì đổi — React so
 * sánh bằng tham chiếu nên điều đó cắt hẳn một lần render vô ích.
 */

const byId = (a: ChatMessageItem, b: ChatMessageItem) => a.id - b.id;

/**
 * Tin của chính mình về hai đường: response của REST, rồi sự kiện STOMP (Plan 2 cố ý phát cho mọi thiết bị của người
 * gửi). Khử trùng theo id là thứ giữ cho bong bóng chỉ hiện một lần.
 */
export function mergeMessage(list: ChatMessageItem[], incoming: ChatMessageItem): ChatMessageItem[] {
  if (list.some((m) => m.id === incoming.id)) return list;

  const last = list[list.length - 1];
  // Đường thường: tin mới nhất, chỉ cần nối vào đuôi
  if (!last || incoming.id > last.id) return [...list, incoming];
  // Sự kiện tới lệch thứ tự khi mạng chập chờn
  return [...list, incoming].sort(byId);
}

/** Trang lịch sử từ API (mới → cũ) ghép vào đầu danh sách, bỏ những tin đã có. */
export function prependOlder(list: ChatMessageItem[], older: ChatMessageItem[]): ChatMessageItem[] {
  if (older.length === 0) return list;

  const have = new Set(list.map((m) => m.id));
  const fresh = older.filter((m) => !have.has(m.id));
  if (fresh.length === 0) return list;

  return [...fresh, ...list].sort(byId);
}

/** Con trỏ keyset cho trang lịch sử kế tiếp. */
export function oldestId(list: ChatMessageItem[]): number | undefined {
  return list.length === 0 ? undefined : list[0].id;
}

/**
 * Thread được chạm thì nhảy lên đầu danh sách.
 *
 * Sự kiện "read" cố ý không mang unreadCount (backend để kiểu Long cho nó vắng mặt). Dùng `??` chứ không phải `||`:
 * đừng suy ra 0 từ chỗ thiếu, nhưng một số 0 gửi thật thì phải nhận. Lỗi đó đã bị bắt trong smoke của Plan 2.
 */
export function applyConversationEvent(
  threads: ConversationSummary[],
  frame: ConversationEventFrame,
): ConversationSummary[] {
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
