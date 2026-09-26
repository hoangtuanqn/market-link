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
vi.mock('@/lib/realtime/stompClient', () => ({
  realtime: {
    start: vi.fn(),
    publish: vi.fn(),
    subscribe: vi.fn((destination: string, handler: (body: string) => void) => {
      handlers.set(destination, handler);
      return () => handlers.delete(destination);
    }),
  },
}));

vi.mock('@/utils/session', () => ({
  default: { getUser: () => ({ id: 7 }) },
}));

const msg = (id: number, senderId = 3) => ({
  id,
  conversationId: 42,
  senderId,
  kind: 'text' as const,
  body: `m${id}`,
  createdAt: '2026-09-26T10:00:00Z',
});

const emit = (destination: string, payload: unknown) => act(() => handlers.get(destination)?.(JSON.stringify(payload)));

describe('useConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    vi.mocked(ConversationApi.messages).mockResolvedValue({
      success: true,
      message: 'OK',
      data: [msg(3), msg(2), msg(1)],
      timestamp: '',
    } as never);
    vi.mocked(ConversationApi.markRead).mockResolvedValue({
      success: true,
      message: 'OK',
      data: null,
      timestamp: '',
    } as never);
  });

  it('loads the newest page oldest-first', async () => {
    const { result } = renderHook(() => useConversation(42));

    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual([1, 2, 3]));
  });

  it('marks the thread read once it is open', async () => {
    renderHook(() => useConversation(42));

    await waitFor(() => expect(ConversationApi.markRead).toHaveBeenCalledWith(42));
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

    emit('/user/topic/messages', { ...msg(9), conversationId: 99 });

    await waitFor(() => expect(result.current.messages).toHaveLength(3));
  });

  /** Review Focus #1 ở tầng hook: gửi xong thì sự kiện về cũng không nhân đôi bong bóng. */
  it('does not show a message twice when the socket echoes what REST already returned', async () => {
    vi.mocked(ConversationApi.send).mockResolvedValue({
      success: true,
      message: 'Sent.',
      data: msg(4, 7),
      timestamp: '',
    } as never);
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));

    await act(() => result.current.send('hello'));
    emit('/user/topic/messages', msg(4, 7));

    await waitFor(() => expect(result.current.messages.filter((m) => m.id === 4)).toHaveLength(1));
  });

  it('asks for the next page back with the oldest id it has', async () => {
    const { result } = renderHook(() => useConversation(42));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    vi.mocked(ConversationApi.messages).mockResolvedValue({
      success: true,
      message: 'OK',
      data: [msg(0)],
      timestamp: '',
    } as never);

    await act(() => result.current.loadOlder());

    expect(ConversationApi.messages).toHaveBeenLastCalledWith(42, { before: 1, size: 30 });
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

  /** Màn 1440px đổi thread tại chỗ, không dựng lại panel: tin của thread cũ không được nán lại. */
  it('drops the previous thread as soon as another one is picked', async () => {
    const { result, rerender } = renderHook(({ id }) => useConversation(id), { initialProps: { id: 42 } });
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    vi.mocked(ConversationApi.messages).mockReturnValue(new Promise(() => {}));

    rerender({ id: 43 });

    expect(result.current.messages).toEqual([]);
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

    act(() => {
      globalThis.dispatchEvent(new Event('online'));
    });

    await waitFor(() => expect(ConversationApi.messages).toHaveBeenCalledWith(42, { size: 30 }));
  });
});

describe('useThreadList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    vi.mocked(ConversationApi.list).mockResolvedValue({
      success: true,
      message: 'OK',
      data: {
        items: [
          {
            id: 42,
            other: { userId: 3, fullName: 'Cô Tư', role: 'farmer', image: null, online: true, lastSeenAt: null },
            lastMessageText: 'hi',
            lastMessageAt: '2026-09-26T09:00:00Z',
            unreadCount: 0,
            createdAt: '2026-09-20T08:00:00Z',
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
      },
      timestamp: '',
    } as never);
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

  it('surfaces a load error instead of an empty list', async () => {
    vi.mocked(ConversationApi.list).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useThreadList());

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loading).toBe(false);
  });
});
