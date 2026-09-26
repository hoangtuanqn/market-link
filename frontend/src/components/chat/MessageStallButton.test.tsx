import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import MessageStallButton from './MessageStallButton';
import ConversationApi from '@/api-requests/conversation.requests';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/api-requests/conversation.requests', () => ({
  default: { open: vi.fn() },
}));

const mockUser = { id: 7, fullName: 'Test', role: 'customer' };
let mockSessionUser: typeof mockUser | null = mockUser;
vi.mock('@/hooks/useSession', () => ({
  default: () => ({ user: mockSessionUser }),
}));

const LocationDisplay = () => {
  const location = useLocation();
  return (
    <>
      <div data-testid="location">{location.pathname + location.search}</div>
      <div data-testid="from">{(location.state as { from?: string } | null)?.from ?? ''}</div>
    </>
  );
};

const ok = <T,>(data: T) => ({ success: true, message: 'OK', data, timestamp: '' }) as never;

describe('MessageStallButton', () => {
  it('opens the thread and lands on it with the product pinned', async () => {
    mockSessionUser = mockUser;
    vi.mocked(ConversationApi.open).mockResolvedValue(ok({ id: 42, other: {}, unreadCount: 0 }));

    render(
      <MemoryRouter initialEntries={['/stalls/30']}>
        <MessageStallButton farmerId={30} productId={8} />
        <Routes>
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /message this stall/i }));

    expect(ConversationApi.open).toHaveBeenCalledWith(30);
    expect(screen.getByTestId('location')).toHaveTextContent('/messages?c=42&product=8');
  });

  it('sends a signed-out visitor to sign in first, then back here', async () => {
    mockSessionUser = null;
    render(
      <MemoryRouter initialEntries={['/stalls/30']}>
        <MessageStallButton farmerId={30} />
        <Routes>
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /message this stall/i }));

    expect(ConversationApi.open).not.toHaveBeenCalled();
    // Trang Login đọc đích quay về ở location.state.from (như RequireAuth, FavoriteButton), không đọc query
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
    expect(screen.getByTestId('from')).toHaveTextContent('/stalls/30');
  });

  const http = (status: number) =>
    new AxiosError('x', 'ERR', undefined, undefined, {
      status,
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {},
    });

  it('explains that you cannot message your own stall', async () => {
    mockSessionUser = mockUser;
    vi.mocked(ConversationApi.open).mockRejectedValue(http(400));

    render(
      <MemoryRouter>
        <MessageStallButton farmerId={30} />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /message this stall/i }));

    expect(await screen.findByText(/this is your own stall/i)).toBeInTheDocument();
  });

  it('says so when the stall is not taking new conversations (403)', async () => {
    mockSessionUser = mockUser;
    vi.mocked(ConversationApi.open).mockRejectedValue(http(403));

    render(
      <MemoryRouter>
        <MessageStallButton farmerId={30} />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /message this stall/i }));

    expect(await screen.findByText(/not taking new conversations/i)).toBeInTheDocument();
  });
});
