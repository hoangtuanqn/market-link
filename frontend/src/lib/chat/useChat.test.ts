import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConversation, useThreadList } from './useChat';
import ConversationApi from '@/api-requests/conversation.requests';
import { realtime } from '@/lib/realtime/stompClient';

vi.mock('@/api-requests/conversation.requests', () => ({
  default: {
    list: vi.fn(),
    messages: vi.fn(),
    send: vi.fn(),
    markRead: vi.fn(),
    uploadPhoto: vi.fn(),
  },
}));

const handlers = new Map<string, (body: string) => void>();
const connectListeners = new Set<() => void>();
vi.mock('@/lib/realtime/stompClient', () => ({
  realtime: {
    start: vi.fn(),
    publish: vi.fn(),
    subscribe: vi.fn((destination: string, handler: (body: string) => void) => {
      handlers.set(destination, handler);
      return () => handlers.delete(destination);
    }),
    onConnect: vi.fn((listener: () => void) => {
      connectListeners.add(listener);
      return () => connectListeners.delete(listener);
    }),
  },
}));

vi.mock('@/utils/session', () => ({
  default: { getUser: () => ({ id: 7 }) },
}));

const msg = (id: number, senderId = 3, conversationId = 42) => ({
  id,
  conversationId,
  senderId,
  kind: 'text' as const,
  body: `m${id}`,
  createdAt: '2026-09-26T10:00:00Z',
});

const ok = <T>(data: T) => ({ success: true, message: 'OK', data, timestamp: '' }) as never;

/** Một promise mà test tự quyết lúc nào trả về, để dựng phản hồi đến muộn. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const emit = (destination: string, payload: unknown) => act(() => handlers.get(destination)?.(JSON.stringify(payload)));

/** Socket vừa nối lại xong. */
const reconnect = () =>
  act(() => {
    connectListeners.forEach((listener) => listener());
  });

describe('useConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    connectListeners.clear();
    vi.mocked(ConversationApi.messages).mockResolvedValue(ok([msg(3), msg(2), msg(1)]));
    vi.mocked(ConversationApi.markRead).mockResolvedValue(ok(null));
  });

  it('loads the newest page oldest-first', async () => {
    const { result } = renderHook(() => useConversation(42));

    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual([1, 2, 3]));
  });

  it('marks the thread read once it is open', async () => {
    renderHook(() => useConversation(42));

    await waitFor(() => expect(ConversationApi.markRead).toHaveBeenCalledWith(42));
  });

  /** Tin đã tải xong mà chỉ bước đánh dấu đã đọc hỏng thì vẫn phải hiện thread, không phải màn lỗi. */
  it('still shows the thread when marking it read fails', async () => {
    vi.mocked(ConversationApi.markRead).mockRejectedValue(new Error('429'));
    const { result } = renderHook(() => useConversation(42));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(false);
    expect(result.current.messages).toHaveLength(3);
  });

  it('adds a message that arrives over the socket', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));

    emit('/user/topic/messages', msg(4));

    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual([1, 2, 3, 4]));
  });

  it('ignores a socket message for another thread', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));

    emit('/user/topic/messages', msg(9, 3, 99));

    await waitFor(() => expect(result.current.messages).toHaveLength(3));
  });

  /** Review Focus #3: admin ẩn một tin → cả hai bên thấy nó biến mất ngay. */
  it('removes a message an admin hid', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));

    emit('/user/topic/conversations', { type: 'hidden', conversationId: 42, messageId: 2 });

    expect(result.current.messages.map((m) => m.id)).toEqual([1, 3]);
  });

  /** Review Focus #7: tab ở nền thì chưa "xem"; hiện tab lên mới đánh dấu. */
  it('waits until the tab is visible before marking read', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    vi.mocked(ConversationApi.markRead).mockClear();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

    emit('/user/topic/messages', msg(4));
    expect(ConversationApi.markRead).not.toHaveBeenCalled();

    visibility.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(ConversationApi.markRead).toHaveBeenCalledWith(42);
    visibility.mockRestore();
  });

  /** "Seen" còn sau khi tải lại: bắt đầu từ mốc đọc mà danh sách thread đã có. */
  it('starts from the read marker the thread list already has', () => {
    const { result } = renderHook(() => useConversation(42, { otherReadAt: '2026-09-26T10:05:00Z' }));

    expect(result.current.otherReadAt).toBe('2026-09-26T10:05:00Z');
  });

  /** Review Focus #1 ở tầng hook: gửi xong thì sự kiện về cũng không nhân đôi bong bóng. */
  it('does not show a message twice when the socket echoes what REST already returned', async () => {
    vi.mocked(ConversationApi.send).mockResolvedValue(ok(msg(4, 7)));
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));

    await act(() => result.current.send('hello'));
    emit('/user/topic/messages', msg(4, 7));

    await waitFor(() => expect(result.current.messages.filter((m) => m.id === 4)).toHaveLength(1));
  });

  it('asks for the next page back with the oldest id it has', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    vi.mocked(ConversationApi.messages).mockResolvedValue(ok([msg(0)]));

    await act(() => result.current.loadOlder());

    expect(ConversationApi.messages).toHaveBeenLastCalledWith(42, { before: 1, size: 30 });
  });

  /** Bấm "tải thêm" hai lần liền: một request là đủ. */
  it('does not ask for the same older page twice at once', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    vi.mocked(ConversationApi.messages).mockClear();
    const page = deferred<unknown>();
    vi.mocked(ConversationApi.messages).mockReturnValue(page.promise as never);

    act(() => {
      void result.current.loadOlder();
      void result.current.loadOlder();
    });
    await act(async () => page.resolve(ok([msg(0)])));

    expect(ConversationApi.messages).toHaveBeenCalledTimes(1);
  });

  /** Trang cũ hỏng thì báo riêng, không xoá những tin đang đọc và không ném lỗi ra ngoài. */
  it('reports a failed older page without losing the thread', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    vi.mocked(ConversationApi.messages).mockRejectedValue(new Error('network'));

    await act(() => result.current.loadOlder());

    expect(result.current.olderError).toBe(true);
    expect(result.current.error).toBe(false);
    expect(result.current.messages).toHaveLength(3);
  });

  /** Trang cuối trả ít hơn size → không còn gì để tải, nút "tải thêm" phải tắt. */
  it('knows when there is nothing older left', async () => {
    const { result } = renderHook(() => useConversation(42));

    await waitFor(() => expect(result.current.hasMore).toBe(false));
  });

  it('shows the other person typing, and only for this thread', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));

    emit('/user/topic/typing', { conversationId: 42, userId: 3, typing: true });
    await waitFor(() => expect(result.current.otherTyping).toBe(true));

    emit('/user/topic/typing', { conversationId: 99, userId: 3, typing: false });
    await waitFor(() => expect(result.current.otherTyping).toBe(true));
  });

  /** Người kia gõ xong và gửi: tin tới là đủ biết họ ngừng gõ, không đợi 6 giây hay một frame typing:false. */
  it('hides the typing dots as soon as their message arrives', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    emit('/user/topic/typing', { conversationId: 42, userId: 3, typing: true });

    emit('/user/topic/messages', msg(4));

    expect(result.current.otherTyping).toBe(false);
  });

  /** Spec §7.4: chiều vào duy nhất là /app/typing với { conversationId, typing }. */
  it('tells the other person when I start and stop typing', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));

    act(() => result.current.typing(true));
    act(() => result.current.typing(false));

    expect(realtime.publish).toHaveBeenNthCalledWith(1, '/app/typing', { conversationId: 42, typing: true });
    expect(realtime.publish).toHaveBeenNthCalledWith(2, '/app/typing', { conversationId: 42, typing: false });
  });

  /** Composer gọi typing(true) ở mỗi phím; server giới hạn 120 frame/phút và bỏ im lặng phần vượt. */
  it('does not send a frame for every keystroke', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));

    act(() => {
      result.current.typing(true);
      result.current.typing(true);
      result.current.typing(true);
      result.current.typing(false);
      result.current.typing(false);
    });

    expect(realtime.publish).toHaveBeenCalledTimes(2);
  });

  /** Đang gõ dở mà rời thread thì ba chấm bên kia phải tắt ngay, không đợi 6 giây. */
  it('says I stopped typing when I leave the thread mid-sentence', async () => {
    const { result, rerender } = renderHook(({ id }) => useConversation(id), { initialProps: { id: 42 } });
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    act(() => result.current.typing(true));

    rerender({ id: 43 });

    expect(realtime.publish).toHaveBeenLastCalledWith('/app/typing', { conversationId: 42, typing: false });
  });

  /** FR-112 "đã xem": backend gửi "read" cho người gửi khi đối phương đọc. */
  it('remembers when the other person read the thread', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));

    emit('/user/topic/conversations', {
      type: 'read',
      conversationId: 99,
      readerId: 5,
      readAt: '2026-09-26T10:01:00Z',
    });
    expect(result.current.otherReadAt).toBeNull();

    emit('/user/topic/conversations', {
      type: 'read',
      conversationId: 42,
      readerId: 3,
      readAt: '2026-09-26T10:02:00Z',
    });
    expect(result.current.otherReadAt).toBe('2026-09-26T10:02:00Z');
  });

  /** Màn 1440px đổi thread tại chỗ, không dựng lại panel: tin của thread cũ không được nán lại. */
  it('drops the previous thread as soon as another one is picked', async () => {
    const { result, rerender } = renderHook(({ id }) => useConversation(id), { initialProps: { id: 42 } });
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    vi.mocked(ConversationApi.messages).mockReturnValue(new Promise(() => {}));

    rerender({ id: 43 });

    expect(result.current.messages).toEqual([]);
  });

  /** Bấm thread A rồi B thật nhanh, mà A trả lời sau B: tin của A không được đè lên màn B. */
  it('ignores a late answer for a thread that is no longer open', async () => {
    const late = deferred<unknown>();
    vi.mocked(ConversationApi.messages).mockReturnValueOnce(late.promise as never);
    vi.mocked(ConversationApi.messages).mockResolvedValueOnce(ok([msg(10, 3, 43)]));
    const { result, rerender } = renderHook(({ id }) => useConversation(id), { initialProps: { id: 42 } });

    rerender({ id: 43 });
    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual([10]));
    await act(async () => late.resolve(ok([msg(3), msg(2), msg(1)])));

    expect(result.current.messages.map((m) => m.id)).toEqual([10]);
  });

  it('does nothing at all when no thread is open', async () => {
    const { result } = renderHook(() => useConversation(null));

    act(() => result.current.typing(true));

    expect(ConversationApi.messages).not.toHaveBeenCalled();
    expect(ConversationApi.markRead).not.toHaveBeenCalled();
    expect(realtime.publish).not.toHaveBeenCalled();
  });

  /** Review Focus #3: STOMP tự nối lại nhưng không phát lại tin đã lỡ. */
  it('refetches the open thread when the socket comes back', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    vi.mocked(ConversationApi.messages).mockClear();

    reconnect();

    await waitFor(() => expect(ConversationApi.messages).toHaveBeenCalledWith(42, { size: 30 }));
  });

  /** Tải bù chỉ GỘP trang mới nhất vào, không thay cả danh sách: trang cũ đã cuộn lên đọc vẫn còn. */
  it('catches up without dropping the older pages already loaded', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    vi.mocked(ConversationApi.messages).mockResolvedValue(ok([msg(0)]));
    await act(() => result.current.loadOlder());
    vi.mocked(ConversationApi.messages).mockResolvedValue(ok([msg(5), msg(4), msg(3)]));

    reconnect();

    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual([0, 1, 2, 3, 4, 5]));
  });
});

describe('useThreadList', () => {
  const summary = (id: number, unreadCount = 0) => ({
    id,
    other: { userId: 3, fullName: 'Cô Tư', role: 'farmer', image: null, online: false, lastSeenAt: null },
    lastMessageText: 'hi',
    lastMessageAt: '2026-09-26T09:00:00Z',
    unreadCount,
    createdAt: '2026-09-20T08:00:00Z',
  });
  const page = (...items: ReturnType<typeof summary>[]) => ok({ items, page: 1, pageSize: 20, total: items.length });

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    connectListeners.clear();
    vi.mocked(ConversationApi.list).mockResolvedValue(page(summary(42)));
  });

  it('moves a thread to the top when an event touches it', async () => {
    const { result } = renderHook(() => useThreadList());
    await waitFor(() => expect(result.current.threads).toHaveLength(1));

    emit('/user/topic/conversations', {
      type: 'updated',
      conversationId: 42,
      lastMessageText: 'still fresh?',
      unreadCount: 2,
    });

    await waitFor(() => expect(result.current.threads[0].unreadCount).toBe(2));
    expect(result.current.threads[0].lastMessageText).toBe('still fresh?');
  });

  /** Review Focus #3: dòng xem trước có thể chính là tin vừa bị ẩn. */
  it('refreshes the preview when a message is hidden', async () => {
    const { result } = renderHook(() => useThreadList());
    await waitFor(() => expect(result.current.threads).toHaveLength(1));
    vi.mocked(ConversationApi.list).mockClear();

    emit('/user/topic/conversations', { type: 'hidden', conversationId: 42, messageId: 5 });

    await waitFor(() => expect(ConversationApi.list).toHaveBeenCalled());
  });

  it('loads the next page of threads and knows when there is no more', async () => {
    vi.mocked(ConversationApi.list).mockResolvedValueOnce(
      ok({ items: [summary(42)], page: 1, pageSize: 20, total: 2 }),
    );
    const { result } = renderHook(() => useThreadList());
    await waitFor(() => expect(result.current.hasMore).toBe(true));
    vi.mocked(ConversationApi.list).mockResolvedValueOnce(
      ok({ items: [summary(43)], page: 2, pageSize: 20, total: 2 }),
    );

    await act(() => result.current.loadMore());

    expect(ConversationApi.list).toHaveBeenLastCalledWith({ page: 2, size: 20 });
    expect(result.current.threads.map((t) => t.id)).toEqual([42, 43]);
    expect(result.current.hasMore).toBe(false);
  });

  it('surfaces a load error instead of an empty list', async () => {
    vi.mocked(ConversationApi.list).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useThreadList());

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loading).toBe(false);
  });

  /** Khách nhắn lần đầu: farmer chưa có thread đó trong danh sách, và sự kiện không mang tên người gửi. */
  it('reloads the list when a message lands in a thread it does not have yet', async () => {
    const { result } = renderHook(() => useThreadList());
    await waitFor(() => expect(result.current.threads).toHaveLength(1));
    vi.mocked(ConversationApi.list).mockResolvedValue(page(summary(77, 1), summary(42)));

    emit('/user/topic/conversations', {
      type: 'updated',
      conversationId: 77,
      lastMessageText: 'hello',
      unreadCount: 1,
    });

    await waitFor(() => expect(result.current.threads.map((t) => t.id)).toEqual([77, 42]));
  });

  /**
   * Backend gửi "read" cho người KIA, không gửi cho người vừa đọc; và tin tới thread đang mở vẫn mang unreadCount 1 vì
   * nó được đếm trước khi hook kịp đánh dấu đã đọc. Thread đang mở thì badge phải là 0.
   */
  it('clears the badge of the thread that is open, and keeps it clear', async () => {
    vi.mocked(ConversationApi.list).mockResolvedValue(page(summary(42, 3)));
    const { result, rerender } = renderHook(({ active }) => useThreadList(active), {
      initialProps: { active: null as number | null },
    });
    await waitFor(() => expect(result.current.threads[0].unreadCount).toBe(3));

    rerender({ active: 42 });
    expect(result.current.threads[0].unreadCount).toBe(0);

    emit('/user/topic/conversations', { type: 'updated', conversationId: 42, unreadCount: 1 });
    expect(result.current.threads[0].unreadCount).toBe(0);

    rerender({ active: null });
    expect(result.current.threads[0].unreadCount).toBe(0);
  });

  it('follows the other person going online', async () => {
    const { result } = renderHook(() => useThreadList());
    await waitFor(() => expect(result.current.threads).toHaveLength(1));

    emit('/user/topic/presence', { userId: 3, online: true, lastSeenAt: null });

    expect(result.current.threads[0].other.online).toBe(true);
  });

  /** Review Focus #3 cho danh sách: preview và badge tới lúc rớt mạng phải được bù, mà không nháy màn "đang tải". */
  it('catches up quietly when the socket comes back', async () => {
    const { result } = renderHook(() => useThreadList());
    await waitFor(() => expect(result.current.threads).toHaveLength(1));
    vi.mocked(ConversationApi.list).mockResolvedValue(page(summary(42, 4)));

    reconnect();

    expect(result.current.loading).toBe(false);
    await waitFor(() => expect(result.current.threads[0].unreadCount).toBe(4));
  });
});
