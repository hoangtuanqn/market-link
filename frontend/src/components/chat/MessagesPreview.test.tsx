import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import MessagesPreview from './MessagesPreview';
import ConversationApi from '@/api-requests/conversation.requests';

vi.mock('@/api-requests/conversation.requests', () => ({
  default: { list: vi.fn() },
}));

const ok = <T,>(data: T) => ({ success: true, message: 'OK', data, timestamp: '' }) as never;

const threads = Array.from({ length: 5 }).map((_, i) => ({
  id: i + 1,
  other: {
    id: 10 + i,
    name: `User ${i + 1}`,
    role: 'farmer',
    stallName: `Stall ${i + 1}`,
    avatarUrl: null,
    online: false,
    lastSeenAt: null,
  },
  lastMessageAt: '2026-09-26T10:00:00Z',
  lastMessageText: `Message ${i + 1}`,
  unreadCount: i % 2 === 0 ? 1 : 0,
}));

describe('MessagesPreview', () => {
  it('renders up to 4 threads', async () => {
    vi.mocked(ConversationApi.list).mockResolvedValue(
      ok({ items: threads.slice(0, 4), page: 1, pageSize: 4, total: 5 }),
    );

    render(
      <MemoryRouter>
        <MessagesPreview to="/messages" />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Stall 1')).toBeInTheDocument();
    expect(screen.queryByText('Stall 5')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('shows empty message', async () => {
    vi.mocked(ConversationApi.list).mockResolvedValue(ok({ items: [], page: 1, pageSize: 4, total: 0 }));

    render(
      <MemoryRouter>
        <MessagesPreview to="/messages" />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no conversations yet/i)).toBeInTheDocument();
  });

  it('shows error message', async () => {
    vi.mocked(ConversationApi.list).mockRejectedValue(new Error('network'));

    render(
      <MemoryRouter>
        <MessagesPreview to="/messages" />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/could not load/i)).toBeInTheDocument();
  });

  /** FR-084: loading is a state with words, readable by a screen reader and translated. */
  it('says it is loading, in the reader’s language', () => {
    vi.mocked(ConversationApi.list).mockReturnValue(new Promise(() => {}) as never);
    render(
      <MemoryRouter>
        <MessagesPreview to="/messages" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading conversations…');
  });
});
