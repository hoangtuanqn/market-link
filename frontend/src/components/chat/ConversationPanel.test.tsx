import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConversationPanel from './ConversationPanel';

const useConversation = vi.fn();
vi.mock('@/lib/chat/useChat', () => ({ useConversation: () => useConversation() }));

const other = { userId: 3, fullName: 'Cô Tư', role: 'farmer', image: null, online: true, lastSeenAt: null } as const;
const thread = {
  id: 42,
  other,
  lastMessageText: '',
  lastMessageAt: '',
  unreadCount: 0,
  otherReadAt: undefined,
  createdAt: '',
};
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
    // jsdom has no scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  /**
   * Review Focus #10: "Seen" once, under the last message of mine that they have read. Compared as a Date, not as an
   * ISO string.
   */
  it('shows Seen once, under my latest message they have read', () => {
    useConversation.mockReturnValue(state({ otherReadAt: '2026-09-26T10:03:00Z' }));
    render(<ConversationPanel conversationId={42} thread={thread} />);

    expect(screen.getAllByText('Seen')).toHaveLength(1);
    expect(screen.getByTestId('message-2')).toHaveTextContent('Seen');
  });

  it('says so when older messages fail, and keeps the thread', () => {
    useConversation.mockReturnValue(state({ olderError: true }));
    render(<ConversationPanel conversationId={42} thread={thread} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load older messages');
    expect(screen.getByText('m3')).toBeInTheDocument();
  });

  it('scrolls to a new message at the bottom', () => {
    useConversation.mockReturnValue(state({}));
    const { rerender } = render(<ConversationPanel conversationId={42} thread={thread} />);
    scrollIntoView.mockClear();

    useConversation.mockReturnValue(state({ messages: [mine(1, 1), mine(2, 2), mine(3, 5), mine(4, 6)] }));
    rerender(<ConversationPanel conversationId={42} thread={thread} />);

    expect(scrollIntoView).toHaveBeenCalled();
  });

  /** Review Focus #2 at the UI layer: scrolling up to read old messages must not get pulled back to the bottom. */
  it('stays put when older messages are added above', () => {
    useConversation.mockReturnValue(state({}));
    const { rerender } = render(<ConversationPanel conversationId={42} thread={thread} />);
    scrollIntoView.mockClear();

    useConversation.mockReturnValue(state({ messages: [mine(0, 0), mine(1, 1), mine(2, 2), mine(3, 5)] }));
    rerender(<ConversationPanel conversationId={42} thread={thread} />);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('sends typing to the hook from the composer', async () => {
    const typing = vi.fn();
    useConversation.mockReturnValue(state({ typing }));
    render(<ConversationPanel conversationId={42} thread={thread} />);

    fireEvent.change(screen.getByLabelText('Write a message'), { target: { value: 'h' } });

    expect(typing).toHaveBeenCalledWith(true);
  });

  /**
   * Spec §9.2: Back only makes sense on a narrow screen, where the list and the conversation are two separate screens.
   * From md up they are two columns.
   */
  it('offers Back only on narrow screens', () => {
    useConversation.mockReturnValue(state({}));
    render(<ConversationPanel conversationId={42} thread={thread} onBack={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Back' })).toHaveClass('md:hidden');
  });

  /** No thread selected: the hint sits in the middle of the empty frame, not tucked in the top-left corner. */
  it('centres the pick-a-conversation hint in the empty panel', () => {
    useConversation.mockReturnValue(state({ messages: [] }));
    render(<ConversationPanel conversationId={null} thread={null} />);

    expect(screen.getByText('Pick a conversation').parentElement).toHaveClass('justify-center');
  });

  /** "Last seen 11:47" that was actually three days ago reads as if it were today: a different day must show the date. */
  it('says which day the other person was last seen when it was not today', () => {
    useConversation.mockReturnValue(state({}));
    const awayThread = { ...thread, other: { ...other, online: false, lastSeenAt: '2026-09-20T03:00:00Z' } };
    render(<ConversationPanel conversationId={42} thread={awayThread as never} />);

    expect(screen.getByText(/last seen/i)).toHaveTextContent('20/09');
  });

  /** Only the other person's message can be reported; my own message has no button. */
  it('offers Report only on the other person’s messages', () => {
    useConversation.mockReturnValue(state({ messages: [mine(1, 1), { ...mine(2, 2), senderId: 3 }] }));
    render(<ConversationPanel conversationId={42} thread={thread as never} />);

    expect(screen.getAllByRole('button', { name: /report this message/i })).toHaveLength(1);
  });
});
