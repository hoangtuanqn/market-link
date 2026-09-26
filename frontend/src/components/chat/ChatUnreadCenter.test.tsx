import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChatUnreadCenter from './ChatUnreadCenter';
import ConversationApi from '@/api-requests/conversation.requests';
import { ChatUnreadStore } from '@/lib/chat/unreadStore';
import { realtime } from '@/lib/realtime/stompClient';

vi.mock('@/api-requests/conversation.requests', () => ({
  default: { unreadCount: vi.fn() },
}));
vi.mock('@/lib/realtime/stompClient', () => ({
  realtime: {
    subscribe: vi.fn().mockReturnValue(vi.fn()),
    onConnect: vi.fn().mockReturnValue(vi.fn()),
  },
}));

const session = vi.hoisted(() => ({ user: { id: 1, role: 'customer' } as { id: number; role: string } | null }));
vi.mock('@/hooks/useSession', () => ({ default: () => session }));

const ok = <T,>(data: T) => ({ success: true, message: 'OK', data, timestamp: '' }) as never;

describe('ChatUnreadCenter', () => {
  it('loads the count, then refreshes it when a conversation event arrives', async () => {
    vi.mocked(ConversationApi.unreadCount)
      .mockResolvedValueOnce(ok({ count: 2 }))
      .mockResolvedValueOnce(ok({ count: 5 }));

    render(<ChatUnreadCenter />);
    await waitFor(() => expect(ChatUnreadStore.getUnread()).toBe(2));

    // Simulate realtime event
    const subscribeMock = vi.mocked(realtime.subscribe);
    const callback = subscribeMock.mock.calls[0][1];
    // Handler STOMP nhận thân khung là chuỗi JSON, không phải object
    act(() => callback(JSON.stringify({ type: 'updated', conversationId: 42, unreadCount: 3 })));

    await waitFor(() => expect(ChatUnreadStore.getUnread()).toBe(5));
  });

  it('catches up after the socket reconnects', async () => {
    vi.mocked(ConversationApi.unreadCount).mockResolvedValue(ok({ count: 4 }));
    render(<ChatUnreadCenter />);

    const onConnectMock = vi.mocked(realtime.onConnect);
    const connectCallback = onConnectMock.mock.calls[0][0];

    vi.mocked(ConversationApi.unreadCount).mockResolvedValueOnce(ok({ count: 8 }));
    connectCallback();

    await waitFor(() => expect(ChatUnreadStore.getUnread()).toBe(8));
  });

  /** Đăng xuất: badge của người trước không được nán lại, và không gọi API khi không có phiên. */
  it('resets to zero when nobody is signed in', () => {
    ChatUnreadStore.setUnread(6);
    vi.mocked(ConversationApi.unreadCount).mockClear();
    session.user = null;

    render(<ChatUnreadCenter />);

    expect(ChatUnreadStore.getUnread()).toBe(0);
    expect(ConversationApi.unreadCount).not.toHaveBeenCalled();
    session.user = { id: 1, role: 'customer' };
  });
});
