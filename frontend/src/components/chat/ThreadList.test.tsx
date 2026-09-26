import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ThreadList from './ThreadList';
import type { ConversationSummary } from '@/types/chat.types';

const thread = (id: number, unreadCount = 0, fullName = 'Cô Tư'): ConversationSummary => ({
  id,
  other: { userId: id + 100, fullName, role: 'farmer', image: null, online: false, lastSeenAt: null },
  lastMessageText: 'Five bunches left',
  lastMessageAt: '2026-09-26T09:00:00Z',
  unreadCount,
  createdAt: '2026-09-20T08:00:00Z',
});

describe('ThreadList', () => {
  it('shows a loading state before the first page arrives', () => {
    render(<ThreadList threads={[]} activeId={null} onPick={vi.fn()} loading error={false} onRetry={vi.fn()} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  /** Review Focus #5: người dùng mới, chưa nhắn ai. */
  it('shows an empty state with something to do', () => {
    render(
      <ThreadList threads={[]} activeId={null} onPick={vi.fn()} loading={false} error={false} onRetry={vi.fn()} />,
    );

    expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
    expect(screen.getByText(/message a stall/i)).toBeInTheDocument();
  });

  it('offers a retry when the list could not be loaded', async () => {
    const onRetry = vi.fn();
    render(<ThreadList threads={[]} activeId={null} onPick={vi.fn()} loading={false} error onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(onRetry).toHaveBeenCalled();
  });

  it('marks the unread ones and tells the reader how many', () => {
    render(
      <ThreadList
        threads={[thread(1, 3), thread(2, 0, 'Gió Nam')]}
        activeId={null}
        onPick={vi.fn()}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/3 unread/i)).toBeInTheDocument();
  });

  it('tells assistive tech which thread is open', () => {
    render(
      <ThreadList
        threads={[thread(1), thread(2, 0, 'Gió Nam')]}
        activeId={2}
        onPick={vi.fn()}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /gió nam/i })).toHaveAttribute('aria-current', 'true');
  });

  it('opens a thread when it is picked', async () => {
    const onPick = vi.fn();
    render(
      <ThreadList
        threads={[thread(7)]}
        activeId={null}
        onPick={onPick}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /cô tư/i }));

    expect(onPick).toHaveBeenCalledWith(7);
  });
});
