import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConversationPanel from './ConversationPanel';

const useConversation = vi.fn();
vi.mock('@/lib/chat/useChat', () => ({ useConversation: () => useConversation() }));

const other = { userId: 3, fullName: 'Cô Tư', role: 'farmer', image: null, online: true, lastSeenAt: null };
const mine = (id: number, minute: number) => ({
  id,
  conversationId: 42,
  senderId: 7,
  kind: 'text' as const,
  body: `m${id}`,
  createdAt: `2026-09-26T10:0${minute}:00.123Z`,
});
const state = (patch: object) => ({
  messages: [mine(1, 1), mine(2, 2), mine(3, 5)],
  loading: false,
  error: false,
  hasMore: true,
  loadOlder: vi.fn(),
  olderError: false,
  send: vi.fn(),
  sendPhoto: vi.fn(),
  typing: vi.fn(),
  otherTyping: false,
  otherReadAt: null,
  meId: 7,
  ...patch,
});

const scrollIntoView = vi.fn();

describe('ConversationPanel', () => {
  beforeEach(() => {
    useConversation.mockReset();
    scrollIntoView.mockReset();
    // jsdom không có scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  /** Review Focus #10: "Seen" một lần, dưới tin cuối cùng của mình mà họ đã đọc. So bằng Date, không so chuỗi ISO. */
  it('shows Seen once, under my latest message they have read', () => {
    useConversation.mockReturnValue(state({ otherReadAt: '2026-09-26T10:03:00Z' }));
    render(<ConversationPanel conversationId={42} other={other} />);

    expect(screen.getAllByText('Seen')).toHaveLength(1);
    expect(screen.getByTestId('message-2')).toHaveTextContent('Seen');
  });

  it('says so when older messages fail, and keeps the thread', () => {
    useConversation.mockReturnValue(state({ olderError: true }));
    render(<ConversationPanel conversationId={42} other={other} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load older messages');
    expect(screen.getByText('m3')).toBeInTheDocument();
  });

  it('scrolls to a new message at the bottom', () => {
    useConversation.mockReturnValue(state({}));
    const { rerender } = render(<ConversationPanel conversationId={42} other={other} />);
    scrollIntoView.mockClear();

    useConversation.mockReturnValue(state({ messages: [mine(1, 1), mine(2, 2), mine(3, 5), mine(4, 6)] }));
    rerender(<ConversationPanel conversationId={42} other={other} />);

    expect(scrollIntoView).toHaveBeenCalled();
  });

  /** Review Focus #2 ở tầng giao diện: đang cuộn lên đọc tin cũ thì không được bị kéo về đáy. */
  it('stays put when older messages are added above', () => {
    useConversation.mockReturnValue(state({}));
    const { rerender } = render(<ConversationPanel conversationId={42} other={other} />);
    scrollIntoView.mockClear();

    useConversation.mockReturnValue(state({ messages: [mine(0, 0), mine(1, 1), mine(2, 2), mine(3, 5)] }));
    rerender(<ConversationPanel conversationId={42} other={other} />);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('sends typing to the hook from the composer', async () => {
    const typing = vi.fn();
    useConversation.mockReturnValue(state({ typing }));
    render(<ConversationPanel conversationId={42} other={other} />);

    fireEvent.change(screen.getByLabelText('Write a message'), { target: { value: 'h' } });

    expect(typing).toHaveBeenCalledWith(true);
  });

  /** Spec §9.2: Back chỉ có nghĩa ở màn hẹp, nơi danh sách và hội thoại là hai màn riêng. Từ md là hai cột. */
  it('offers Back only on narrow screens', () => {
    useConversation.mockReturnValue(state({}));
    render(<ConversationPanel conversationId={42} other={other} onBack={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Back' })).toHaveClass('md:hidden');
  });

  /** Chưa chọn thread: câu dẫn nằm giữa khung trống, không nép góc trên trái. */
  it('centres the pick-a-conversation hint in the empty panel', () => {
    useConversation.mockReturnValue(state({ messages: [] }));
    render(<ConversationPanel conversationId={null} other={null} />);

    expect(screen.getByText('Pick a conversation').parentElement).toHaveClass('justify-center');
  });

  /** "Last seen 11:47" mà là ba ngày trước thì đọc như vừa hôm nay: ngày khác phải hiện ngày. */
  it('says which day the other person was last seen when it was not today', () => {
    useConversation.mockReturnValue(state({}));
    const away = { ...other, online: false, lastSeenAt: '2026-09-20T03:00:00Z' };
    render(<ConversationPanel conversationId={42} other={away} />);

    expect(screen.getByText(/last seen/i)).toHaveTextContent('20/09');
  });
});
