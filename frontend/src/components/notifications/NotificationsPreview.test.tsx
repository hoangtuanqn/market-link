import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import NotificationsPreview from './NotificationsPreview';
import NotificationApi from '@/api-requests/notification.requests';

vi.mock('@/api-requests/notification.requests', () => ({
  default: { list: vi.fn() },
}));

const ok = <T,>(data: T) => ({ success: true, message: 'OK', data, timestamp: '' }) as never;

const notifications = Array.from({ length: 5 }).map((_, i) => ({
  id: i + 1,
  kind: 'order',
  title: `Notification ${i + 1}`,
  message: 'Body',
  createdAt: '2026-09-26T10:00:00Z',
  readAt: i % 2 === 0 ? null : '2026-09-26T10:01:00Z',
  link: '/orders/1',
}));

describe('NotificationsPreview', () => {
  it('renders up to 4 notifications', async () => {
    vi.mocked(NotificationApi.list).mockResolvedValue(
      ok({ items: notifications.slice(0, 4), page: 1, pageSize: 4, total: 5 }),
    );

    render(
      <MemoryRouter>
        <NotificationsPreview />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Notification 1')).toBeInTheDocument();
    expect(screen.queryByText('Notification 5')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('shows empty message', async () => {
    vi.mocked(NotificationApi.list).mockResolvedValue(ok({ items: [], page: 1, pageSize: 4, total: 0 }));

    render(
      <MemoryRouter>
        <NotificationsPreview />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no notifications yet/i)).toBeInTheDocument();
  });

  it('shows error message', async () => {
    vi.mocked(NotificationApi.list).mockRejectedValue(new Error('network'));

    render(
      <MemoryRouter>
        <NotificationsPreview />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/could not load/i)).toBeInTheDocument();
  });

  /** FR-084: loading is a state with words, readable by a screen reader and translated. */
  it('says it is loading, in the reader’s language', () => {
    vi.mocked(NotificationApi.list).mockReturnValue(new Promise(() => {}) as never);
    render(
      <MemoryRouter>
        <NotificationsPreview />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });
});
