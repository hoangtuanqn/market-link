import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AssistantChat from './AssistantChat';
import ChatApi, { type ChatReplyDto } from '@/api-requests/chat.requests';

vi.mock('@/api-requests/chat.requests', () => ({ default: { ask: vi.fn(), history: vi.fn() } }));
vi.mock('@/api-requests/order.requests', () => ({
  default: { accept: vi.fn(), markReady: vi.fn(), complete: vi.fn() },
}));
vi.mock('@/api-requests/admin-farmer.requests', () => ({ default: { approve: vi.fn() } }));

const session = vi.hoisted(() => ({ user: { id: 7, role: 'customer' } as { id: number; role: string } }));
vi.mock('@/hooks/useSession', () => ({ default: () => session }));

const reply = (over: Partial<ChatReplyDto>): ChatReplyDto => ({
  reply: 'ok',
  intent: 'UNKNOWN',
  results: [],
  actions: [],
  ...over,
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AssistantChat />
    </MemoryRouter>,
  );

const send = async (text: string) => {
  await userEvent.type(await screen.findByRole('textbox', { name: 'Message' }), text);
  await userEvent.click(screen.getByRole('button', { name: 'Send' }));
};

const PAGE_THE_SERVER_ACCEPTS = /^[a-z/:-]{1,64}$/;

describe('AssistantChat', () => {
  beforeEach(() => {
    vi.mocked(ChatApi.history).mockResolvedValue([]);
    vi.mocked(ChatApi.ask).mockReset();
    session.user = { id: 7, role: 'customer' };
  });

  it('sends a page the server accepts from the home page, whose route pattern is empty', async () => {
    vi.mocked(ChatApi.ask).mockResolvedValue(reply({}));
    renderAt('/');

    await send('xin chào');

    await waitFor(() => expect(ChatApi.ask).toHaveBeenCalled());
    const page = vi.mocked(ChatApi.ask).mock.calls[0][2]?.page;
    expect(page === undefined || PAGE_THE_SERVER_ACCEPTS.test(page)).toBe(true);
  });

  it('opens a proposed decline on the order page, which is addressed by id', async () => {
    session.user = { id: 3, role: 'farmer' };
    vi.mocked(ChatApi.ask).mockResolvedValue(
      reply({
        actions: [
          { action: 'decline_order', id: 20, label: 'ML-20260928-KKXD', detail: 'Khang · 2026-10-03 08:00-09:00' },
        ],
      }),
    );
    renderAt('/farmer');

    await send('Từ chối đơn ML-20260928-KKXD');

    expect(await screen.findByRole('link', { name: 'Open the page' })).toHaveAttribute('href', '/farmer/orders/20');
  });

  it('links an order card to the farmer order page', async () => {
    session.user = { id: 3, role: 'farmer' };
    vi.mocked(ChatApi.ask).mockResolvedValue(
      reply({
        results: [
          { type: 'order', id: 1, title: 'ML-20260920-0001', subtitle: 'Nguyễn Văn An · Chợ Bà Chiểu · placed' },
        ],
      }),
    );
    renderAt('/farmer');

    await send('Tôi có đơn nào chờ duyệt?');

    const card = await screen.findByRole('link', { name: /ML-20260920-0001/ });
    expect(card).toHaveAttribute('href', '/farmer/orders/1');
    expect(card).toHaveTextContent(/^Order/);
  });

  it('links a stall card to the admin stall page for an admin, because a pending stall has no public page', async () => {
    session.user = { id: 1, role: 'admin' };
    vi.mocked(ChatApi.ask).mockResolvedValue(
      reply({ results: [{ type: 'farmer', id: 16, title: 'Rau sạch Cô Bảy', subtitle: 'Trần Thị Bảy · pending' }] }),
    );
    renderAt('/admin');

    await send('Có đơn đăng ký nào đang chờ duyệt?');

    expect(await screen.findByRole('link', { name: /Rau sạch Cô Bảy/ })).toHaveAttribute('href', '/admin/farmers/16');
  });

  it('keeps the public stall page for a customer', async () => {
    vi.mocked(ChatApi.ask).mockResolvedValue(
      reply({ results: [{ type: 'farmer', id: 1, title: 'Vườn Út Hiền', subtitle: 'Chợ Bà Chiểu' }] }),
    );
    renderAt('/products');

    await send('Khung giờ nhận hàng của Vườn Út Hiền?');

    expect(await screen.findByRole('link', { name: /Vườn Út Hiền/ })).toHaveAttribute('href', '/stalls/1');
  });
});
