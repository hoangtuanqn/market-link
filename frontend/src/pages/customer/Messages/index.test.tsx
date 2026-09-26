import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerMessagesPage from './index';
import FarmerMessagesPage from '@/pages/farmer/Messages';

const threads = [
  {
    id: 42,
    other: { userId: 3, fullName: 'Cô Tư', role: 'farmer', image: null, online: true, lastSeenAt: null },
    lastMessageText: 'Five bunches left',
    lastMessageAt: '2026-09-26T09:00:00Z',
    unreadCount: 1,
    createdAt: '2026-09-20T08:00:00Z',
  },
];

const useThreadList = vi.fn();
vi.mock('@/lib/chat/useChat', () => ({
  useThreadList: (activeId: number | null) => useThreadList(activeId),
  useConversation: () => ({
    messages: [],
    loading: false,
    error: false,
    hasMore: false,
    loadOlder: vi.fn(),
    olderError: false,
    send: vi.fn(),
    sendPhoto: vi.fn(),
    typing: vi.fn(),
    otherTyping: false,
    otherReadAt: null,
    meId: 7,
  }),
}));

describe('CustomerMessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThreadList.mockReturnValue({ threads, loading: false, error: false, reload: vi.fn() });
  });

  it('lists the threads', async () => {
    render(<CustomerMessagesPage />);

    expect(await screen.findByRole('button', { name: /cô tư/i })).toBeInTheDocument();
  });

  /** Spec §9.2: 375px là hai màn riêng, nên phải có đường quay lại sau khi mở một thread. */
  it('offers a way back once a thread is open', async () => {
    render(<CustomerMessagesPage />);

    await userEvent.click(await screen.findByRole('button', { name: /cô tư/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument());
  });

  /** Review Focus #14: hook phải biết thread nào đang mở để giữ badge của nó ở 0. */
  it('tells the thread list which thread is open', async () => {
    render(<CustomerMessagesPage />);

    await userEvent.click(await screen.findByRole('button', { name: /cô tư/i }));

    expect(useThreadList).toHaveBeenLastCalledWith(42);
  });

  it('shows the load error with a retry instead of an empty page', async () => {
    const reload = vi.fn();
    useThreadList.mockReturnValue({ threads: [], loading: false, error: true, reload });
    render(<CustomerMessagesPage />);

    await userEvent.click(await screen.findByRole('button', { name: /try again/i }));

    expect(reload).toHaveBeenCalled();
  });
});

/** Spec §9.3: Farmer dùng lại đúng component hội thoại của Customer, chỉ khác vỏ ngoài. */
describe('FarmerMessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThreadList.mockReturnValue({ threads, loading: false, error: false, reload: vi.fn() });
  });

  it('opens a real thread from the list', async () => {
    render(<FarmerMessagesPage />);

    await userEvent.click(await screen.findByRole('button', { name: /cô tư/i }));

    expect(screen.getByRole('region', { name: /conversation with cô tư/i })).toBeInTheDocument();
    expect(useThreadList).toHaveBeenLastCalledWith(42);
  });

  /** Farmer không tự mở được cuộc trò chuyện: câu "nhắn một sạp" của Customer là sai với họ. */
  it('explains where conversations come from when there are none', async () => {
    useThreadList.mockReturnValue({ threads: [], loading: false, error: false, reload: vi.fn() });
    render(<FarmerMessagesPage />);

    expect(await screen.findByText(/when a customer messages your stall/i)).toBeInTheDocument();
    expect(screen.queryByText(/message a stall/i)).not.toBeInTheDocument();
  });
});
