import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerOrderDetailPage from './index';
import CatalogApi from '@/api-requests/catalog.requests';
import OrderApi, { type OrderDetailDto, type OrderItemDto } from '@/api-requests/order.requests';
import QualityReportApi from '@/api-requests/quality-report.requests';
import StallApi from '@/api-requests/stall.requests';
import { money } from '@/lib/format';

vi.mock('@/api-requests/order.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/order.requests')>();
  return { ...real, default: { get: vi.fn(), cancel: vi.fn() } };
});
vi.mock('@/api-requests/stall.requests', () => ({ default: { get: vi.fn() } }));
vi.mock('@/api-requests/catalog.requests', () => ({ default: { getMarket: vi.fn() } }));
vi.mock('@/api-requests/quality-report.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/quality-report.requests')>();
  return { ...real, default: { create: vi.fn(), uploadPhoto: vi.fn() } };
});
// Tuesday 06/10/2026 in Ho Chi Minh City, whatever day the test runs
vi.mock('@/lib/spoilage', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/spoilage')>();
  return { ...real, todayInVietnam: () => '2026-10-06' };
});
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
  vi.mocked(QualityReportApi.create).mockReset();
  vi.mocked(QualityReportApi.uploadPhoto).mockReset();
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

/** Water spinach picked up Saturday 03/10, 5 days in the fridge: good until the end of Monday 05/10. */
const line = (patch: Partial<OrderItemDto> = {}): OrderItemDto => ({
  productId: 3,
  productName: 'Water spinach',
  unit: 'bunch',
  unitPrice: 0.5,
  quantity: 2,
  subtotal: 1,
  bestBefore: '2026-10-05',
  storageMode: 'chilled',
  listPrice: null,
  qualityReport: null,
  itemId: 501,
  ...patch,
});

const completed = (items: OrderItemDto[]) => detail({ items, canCancel: false, canModify: false }, 'completed');

const conflict = (message: string, code: string) =>
  new AxiosError('conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 409,
    data: { success: false, message, error: { code, details: [] } },
  } as never);

const openReport = async () => {
  await userEvent.click(await screen.findByRole('button', { name: 'Report spoiled: Water spinach' }));
  return screen.getByRole('dialog');
};

describe('reporting spoiled produce (FR-122)', () => {
  it('offers "Report spoiled" on a completed line until two days after its good-until date', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(
      completed([
        line(),
        line({ productId: 4, productName: 'Cherry tomatoes', itemId: 502, bestBefore: '2026-10-03' }),
      ]),
    );
    renderAt('/orders/21');

    expect(await screen.findByRole('button', { name: 'Report spoiled: Water spinach' })).toBeInTheDocument();
    // good until 03/10: the window closed at the end of 05/10, today is 06/10
    expect(screen.queryByRole('button', { name: 'Report spoiled: Cherry tomatoes' })).not.toBeInTheDocument();
  });

  it('shows the report instead of the button, and nothing on a line without a good-until date', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(
      completed([
        line({ bestBefore: null, storageMode: null }),
        line({
          productId: 4,
          productName: 'Cherry tomatoes',
          itemId: 502,
          qualityReport: { id: 7, status: 'confirmed', spoiledOn: '2026-10-04', problem: 'mold' },
        }),
      ]),
    );
    renderAt('/orders/21');

    expect(await screen.findByText('Spoilage reported · Confirmed by an admin')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Report spoiled/ })).not.toBeInTheDocument();
  });

  it('is not offered before the order is completed', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(detail({ items: [line()] }, 'ready'));
    renderAt('/orders/21');

    await screen.findByRole('heading', { level: 1, name: /Vườn Út Hiền/ });
    expect(screen.queryByRole('button', { name: /^Report spoiled/ })).not.toBeInTheDocument();
  });

  it('sends the day, what went wrong and the note, then shows the report on the line', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(completed([line()]));
    vi.mocked(QualityReportApi.create).mockResolvedValue({
      id: 77,
      status: 'open',
      spoiledOn: '2026-10-05',
      problem: 'mold',
    });
    renderAt('/orders/21');
    const dialog = await openReport();

    expect(within(dialog).getByRole('button', { name: 'Send report' })).toBeDisabled();
    expect(within(dialog).getByText('Pick what went wrong first.')).toBeInTheDocument();
    await userEvent.selectOptions(within(dialog).getByLabelText(/Spoiled on/), '2026-10-05');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mold' }));
    await userEvent.type(within(dialog).getByLabelText(/Describe it/), 'Leaves turned black');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));

    expect(QualityReportApi.create).toHaveBeenCalledWith(21, 501, {
      spoiledOn: '2026-10-05',
      problem: 'mold',
      note: 'Leaves turned black',
      photoUrl: undefined,
    });
    expect(await screen.findByText('Spoilage reported · Waiting for a decision')).toBeInTheDocument();
  });

  it('offers only the days from pickup to today, today first', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(completed([line()]));
    renderAt('/orders/21');
    const dialog = await openReport();

    const days = within(within(dialog).getByLabelText(/Spoiled on/))
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value);
    expect(days).toEqual(['2026-10-06', '2026-10-05', '2026-10-04', '2026-10-03']);
  });

  it('uploads a photo and sends its address with the report', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(completed([line()]));
    vi.mocked(QualityReportApi.uploadPhoto).mockResolvedValue('/uploads/quality-report-photos/2-a.jpg');
    vi.mocked(QualityReportApi.create).mockResolvedValue({
      id: 77,
      status: 'open',
      spoiledOn: '2026-10-06',
      problem: 'smell',
    });
    renderAt('/orders/21');
    const dialog = await openReport();

    await userEvent.upload(
      within(dialog).getByLabelText(/Add a photo/),
      new File(['x'], 'rau.png', { type: 'image/png' }),
    );
    expect(await within(dialog).findByAltText('Photo of the spoiled produce')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Smells off' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));

    expect(QualityReportApi.create).toHaveBeenCalledWith(
      21,
      501,
      expect.objectContaining({ photoUrl: '/uploads/quality-report-photos/2-a.jpg' }),
    );
  });

  it('refuses a photo over 5 MB without uploading it', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(completed([line()]));
    renderAt('/orders/21');
    const dialog = await openReport();

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' });
    await userEvent.upload(within(dialog).getByLabelText(/Add a photo/), big);

    expect(within(dialog).getByText('The photo must be 5 MB or smaller.')).toBeInTheDocument();
    expect(QualityReportApi.uploadPhoto).not.toHaveBeenCalled();
  });

  /** Review Focus #3: a second send (another tab, a double click) is refused by the server. */
  it('says why a second report was refused', async () => {
    vi.mocked(OrderApi.get).mockResolvedValue(completed([line()]));
    vi.mocked(QualityReportApi.create).mockRejectedValue(
      conflict('You have already reported this item.', 'ALREADY_REPORTED'),
    );
    renderAt('/orders/21');
    const dialog = await openReport();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Mold' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('You have already reported this item.');
  });
});
