import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerOrderDetailPage from './index';
import CatalogApi from '@/api-requests/catalog.requests';
import OrderApi, { type OrderDetailDto } from '@/api-requests/order.requests';
import StallApi from '@/api-requests/stall.requests';
import { money } from '@/lib/format';

vi.mock('@/api-requests/order.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/order.requests')>();
  return { ...real, default: { get: vi.fn(), cancel: vi.fn() } };
});
vi.mock('@/api-requests/stall.requests', () => ({ default: { get: vi.fn() } }));
vi.mock('@/api-requests/catalog.requests', () => ({ default: { getMarket: vi.fn() } }));
// Leaflet does not run in jsdom; the map itself is not what this page test is about
vi.mock('@/components/MarketMap', () => ({ default: () => <div data-testid="map" /> }));
vi.mock('@/components/chat/MessageStallButton', () => ({
  default: (p: { farmerId: number; orderId?: number }) => (
    <button type="button">{`message stall ${p.farmerId} about order ${p.orderId}`}</button>
  ),
}));

const detail = (patch: Partial<OrderDetailDto> = {}, status: OrderDetailDto['summary']['status'] = 'placed') =>
  ({
    summary: {
      orderId: 21,
      orderCode: 'ML-20260920-0001',
      status,
      farmerId: 15,
      stallName: 'Vườn Út Hiền',
      marketId: 1,
      marketName: 'Thảo Điền Weekend Market',
      pickupDate: '2026-10-03',
      pickupStart: '07:00',
      pickupEnd: '08:00',
      cutoffAt: '2026-10-02T12:00:00Z',
      totalAmount: 66000,
      itemCount: 2,
      createdAt: '2026-09-20T01:00:00Z',
    },
    items: [
      { productId: 3, productName: 'Water spinach', unit: 'bunch', unitPrice: 12000, quantity: 3, subtotal: 36000 },
      { productId: 4, productName: 'Cherry tomatoes', unit: 'kg', unitPrice: 30000, quantity: 1, subtotal: 30000 },
    ],
    statusHistory: [
      {
        fromStatus: null,
        toStatus: 'placed',
        changedAt: '2026-09-20T01:00:00Z',
        note: null,
        changedByName: 'Nguyễn Văn An',
        changedByRole: 'customer',
      },
    ],
    canCancel: true,
    canModify: true,
    customerNote: null,
    farmerNote: null,
    ...patch,
  }) as OrderDetailDto;

const httpError = (status: number) =>
  Object.assign(new Error(String(status)), { isAxiosError: true, response: { status } });

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/orders/:code" element={<CustomerOrderDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(OrderApi.get).mockReset().mockResolvedValue(detail());
  vi.mocked(OrderApi.cancel).mockReset();
  vi.mocked(StallApi.get).mockResolvedValue({
    farmerId: 15,
    stallName: 'Vườn Út Hiền',
    contactPerson: 'Lê Thị Út Hiền',
    orderCutoffHours: 12,
    ratingAvg: 4.5,
    ratingCount: 8,
    approvalStatus: 'approved',
    markets: [
      {
        farmerMarketId: 1,
        marketId: 1,
        marketName: 'Thảo Điền Weekend Market',
        stallCode: 'A12',
        stallLatitude: 10.8,
        stallLongitude: 106.73,
        operatingDays: [],
      },
    ],
  } as never);
  vi.mocked(CatalogApi.getMarket).mockResolvedValue({ market: { address: '12 Quốc Hương, Thảo Điền' } } as never);
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

describe('CustomerOrderDetailPage', () => {
  /** Backend notifications link to /orders/{id}; the page reads the numeric id, as every OrderApi call needs. */
  it('loads the order by the id in the address', async () => {
    renderAt('/orders/21');

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: /Vườn Út Hiền/ })).toBeInTheDocument();
    expect(OrderApi.get).toHaveBeenCalledWith(21);
  });

  it('shows what was ordered, at the prices copied when it was placed, and the total', async () => {
    renderAt('/orders/21');

    const items = await screen.findByRole('list', { name: /what you ordered/i });
    expect(within(items).getByText('Water spinach')).toBeInTheDocument();
    expect(within(items).getByText(money(36000))).toBeInTheDocument();
    expect(screen.getAllByText(money(66000)).length).toBeGreaterThan(0);
  });

  it('says where to collect it: market, stall code and address', async () => {
    renderAt('/orders/21');

    expect(await screen.findByText(/Thảo Điền Weekend Market, stall A12/)).toBeInTheDocument();
    expect(await screen.findByText(/12 Quốc Hương/)).toBeInTheDocument();
  });

  it('lists who changed the status and when', async () => {
    renderAt('/orders/21');

    expect(await screen.findByText(/Nguyễn Văn An/)).toBeInTheDocument();
  });

  /** FR-114: the order page is where a customer asks the stall about this order — the chat opens with it pinned. */
  it('offers to message the stall about this order', async () => {
    renderAt('/orders/21');

    expect(await screen.findByRole('button', { name: 'message stall 15 about order 21' })).toBeInTheDocument();
  });

  it('cancels through the server after confirming, and shows the new status', async () => {
    vi.mocked(OrderApi.cancel).mockResolvedValue(detail({ canCancel: false, canModify: false }, 'cancelled'));
    renderAt('/orders/21');

    await userEvent.click(await screen.findByRole('button', { name: /^cancel order$/i }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /^cancel order$/i }));

    expect(OrderApi.cancel).toHaveBeenCalledWith(21);
    expect(await screen.findByText(/can no longer be changed/i)).toBeInTheDocument();
  });

  /** The server decides (cutoff, status): the page does not work it out on its own. */
  it('does not offer to cancel when the server says it can no longer be cancelled', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(detail({ canCancel: false, canModify: false }, 'accepted'));
    renderAt('/orders/21');

    expect(await screen.findByRole('button', { name: /^cancel order$/i })).toBeDisabled();
  });

  it('says why a cancel failed, and keeps the order as it was', async () => {
    vi.mocked(OrderApi.cancel).mockRejectedValue(httpError(409));
    renderAt('/orders/21');

    await userEvent.click(await screen.findByRole('button', { name: /^cancel order$/i }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /^cancel order$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not cancel/i);
  });

  /** 403 (someone else's order) and 404 look the same to the reader: the order is not theirs to see. */
  it('shows the not-found state for an order that is not yours', async () => {
    vi.mocked(OrderApi.get).mockRejectedValue(httpError(403));
    renderAt('/orders/99');

    expect(await screen.findByText(/that order is not here any more/i)).toBeInTheDocument();
  });

  it('shows the not-found state for an address that is not an order id', async () => {
    renderAt('/orders/ML-0421');

    expect(await screen.findByText(/that order is not here any more/i)).toBeInTheDocument();
    expect(OrderApi.get).not.toHaveBeenCalled();
  });

  it('offers a retry when the order could not be loaded', async () => {
    vi.mocked(OrderApi.get).mockRejectedValueOnce(new Error('network'));
    renderAt('/orders/21');

    await userEvent.click(await screen.findByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { level: 1, name: /Vườn Út Hiền/ })).toBeInTheDocument();
  });

  /** Demo switches stay in the prototype (frontend/CLAUDE.md). */
  it('has no preview switch', async () => {
    renderAt('/orders/21');
    await screen.findByRole('heading', { level: 1, name: /Vườn Út Hiền/ });

    expect(screen.queryByText(/preview: after cutoff/i)).not.toBeInTheDocument();
  });
});
