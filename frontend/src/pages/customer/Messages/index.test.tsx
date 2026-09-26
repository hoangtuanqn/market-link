import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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
    render(
      <MemoryRouter>
        <CustomerMessagesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: /cô tư/i })).toBeInTheDocument();
  });

  /** Spec §9.2: at 375px these are two separate screens, so there must be a way back after opening a thread. */
  it('offers a way back once a thread is open', async () => {
    render(
      <MemoryRouter>
        <CustomerMessagesPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /cô tư/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument());
  });

  /** Review Focus #14: the hook must know which thread is open to keep its badge at 0. */
  it('tells the thread list which thread is open', async () => {
    render(
      <MemoryRouter>
        <CustomerMessagesPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /cô tư/i }));

    expect(useThreadList).toHaveBeenLastCalledWith(42);
  });

  it('shows the load error with a retry instead of an empty page', async () => {
    const reload = vi.fn();
    useThreadList.mockReturnValue({ threads: [], loading: false, error: true, reload });
    render(
      <MemoryRouter>
        <CustomerMessagesPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /try again/i }));

    expect(reload).toHaveBeenCalled();
  });
});

/** Spec §9.3: Farmer reuses the exact same conversation component as Customer, only the shell differs. */
describe('FarmerMessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThreadList.mockReturnValue({ threads, loading: false, error: false, reload: vi.fn() });
  });

  it('opens a real thread from the list', async () => {
    render(
      <MemoryRouter>
        <FarmerMessagesPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /cô tư/i }));

    expect(screen.getByRole('region', { name: /conversation with cô tư/i })).toBeInTheDocument();
    expect(useThreadList).toHaveBeenLastCalledWith(42);
  });

  /** A Farmer cannot open a conversation themself: the Customer's "message a stall" sentence is wrong for them. */
  it('explains where conversations come from when there are none', async () => {
    useThreadList.mockReturnValue({ threads: [], loading: false, error: false, reload: vi.fn() });
    render(
      <MemoryRouter>
        <FarmerMessagesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/when a customer messages your stall/i)).toBeInTheDocument();
    expect(screen.queryByText(/message a stall/i)).not.toBeInTheDocument();
  });
});
