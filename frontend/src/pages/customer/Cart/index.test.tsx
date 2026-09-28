import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerCartPage from './index';
import OrderApi, { type PreviewItemDto } from '@/api-requests/order.requests';
import StallApi from '@/api-requests/stall.requests';
import { Cart } from '@/lib/cart';

vi.mock('@/api-requests/order.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/order.requests')>();
  return { ...real, default: { preview: vi.fn(), place: vi.fn() } };
});
vi.mock('@/api-requests/stall.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/stall.requests')>();
  return { ...real, default: { slots: vi.fn() } };
});
vi.mock('@/hooks/useSession', () => ({
  default: () => ({ user: { id: 2, role: 'customer', fullName: 'Khách' }, isLoggedIn: true }),
}));

const slot = (slotId: number, slotDate: string, startTime: string, endTime: string) => ({
  slotId,
  farmerMarketId: 1,
  marketId: 1,
  slotDate,
  startTime,
  endTime,
  maxOrders: 5,
  bookedCount: 0,
  isFull: false,
  isActive: true,
});

beforeEach(() => {
  localStorage.clear();
  Cart.clear();
  Cart.add(
    { productId: 1, name: 'Rau muống', unit: 'bunch', price: 0.5, max: 30, farmerId: 1, stallName: 'Vườn Út Hiền' },
    2,
  );
  vi.mocked(OrderApi.preview).mockResolvedValue([
    {
      farmerId: 1,
      stallName: 'Vườn Út Hiền',
      marketId: 1,
      marketName: 'Chợ Bà Chiểu',
      orderCutoffHours: 12,
      items: [
        {
          productId: 1,
          name: 'Rau muống',
          unit: 'bunch',
          unitPrice: 0.5,
          quantity: 2,
          subtotal: 1,
          stockQuantity: 30,
          status: 'available',
        },
      ],
      subtotal: 1,
      problems: [],
      markets: [{ marketId: 1, marketName: 'Chợ Bà Chiểu' }],
    },
  ] as never);
  vi.mocked(StallApi.slots).mockResolvedValue([
    slot(11, '2026-10-03', '07:00', '08:00'),
    slot(12, '2026-10-04', '07:00', '08:00'),
  ] as never);
  vi.mocked(OrderApi.place).mockResolvedValue([] as never);
});

describe('CustomerCartPage', () => {
  /**
   * The first pickup day is shown already selected; picking a time on it must be enough to place the order, and the
   * order goes out for that day — not blocked with "choose a pickup time", not sent without a date.
   */
  it('places the order for the day shown as selected when only a time is picked', async () => {
    render(
      <MemoryRouter>
        <CustomerCartPage />
      </MemoryRouter>,
    );

    const time = await screen.findByRole('radio', { name: /07:00/ });
    await userEvent.click(time);
    const place = screen.getByRole('button', { name: 'Place 1 order' });
    await waitFor(() => expect(place).toBeEnabled());

    await userEvent.click(place);
    expect(OrderApi.place).toHaveBeenCalledWith([
      expect.objectContaining({ farmerId: 1, marketId: 1, slotId: 11, pickupDate: '2026-10-03' }),
    ]);
  });
});

const renderCart = () =>
  render(
    <MemoryRouter>
      <CustomerCartPage />
    </MemoryRouter>,
  );

/** One stall, one line of 2 bunches of water spinach, with the numbers of the day it is priced for. */
const priced = (item: Partial<PreviewItemDto>) => [
  {
    farmerId: 1,
    stallName: 'Vườn Út Hiền',
    marketId: 1,
    marketName: 'Chợ Bà Chiểu',
    orderCutoffHours: 12,
    items: [
      {
        productId: 1,
        name: 'Rau muống',
        unit: 'bunch',
        unitPrice: 0.5,
        quantity: 2,
        subtotal: 2 * (item.unitPrice ?? 0.5),
        stockQuantity: 30,
        status: 'available',
        ...item,
      },
    ],
    subtotal: 2 * (item.unitPrice ?? 0.5),
    problems: [],
    markets: [{ marketId: 1, marketName: 'Chợ Bà Chiểu' }],
  },
];

const addFromDeals = (pickupDate: string) => {
  Cart.clear();
  Cart.add(
    {
      productId: 1,
      name: 'Rau muống',
      unit: 'bunch',
      price: 0.3,
      max: 12,
      farmerId: 1,
      stallName: 'Vườn Út Hiền',
      pickupDate,
    },
    2,
  );
};

describe('CustomerCartPage — near-expiry deals (FR-125)', () => {
  /** Spec §4.5.5: the stall's day picker starts on the deal day, and the preview prices that day. */
  it('starts a stall on the day its line was added for, priced for that day', async () => {
    addFromDeals('2026-10-04');
    vi.mocked(OrderApi.preview).mockResolvedValue(
      priced({
        unitPrice: 0.3,
        listPrice: 0.5,
        discountPercent: 40,
        bestBefore: '2026-10-05',
        storageMode: 'chilled',
      }) as never,
    );
    renderCart();

    expect(await screen.findByRole('radio', { name: /04\/10/ })).toBeChecked();
    expect(OrderApi.preview).toHaveBeenCalledWith(
      [{ productId: 1, quantity: 2 }],
      [{ farmerId: 1, date: '2026-10-04' }],
    );
    expect(await screen.findByText('−40% near-expiry deal')).toBeInTheDocument();
    expect(screen.getByText('Good until end of Mon 05/10 · Fridge 0–5 °C')).toBeInTheDocument();
  });

  it('re-prices a stall when another day is picked and says the deal is for its own day', async () => {
    addFromDeals('2026-10-04');
    vi.mocked(OrderApi.preview).mockImplementation(
      async (_items, dates) =>
        (dates?.[0]?.date === '2026-10-03'
          ? priced({ unitPrice: 0.5 })
          : priced({ unitPrice: 0.3, listPrice: 0.5, discountPercent: 40, bestBefore: '2026-10-05' })) as never,
    );
    renderCart();

    await userEvent.click(await screen.findByRole('radio', { name: /03\/10/ }));

    await waitFor(() =>
      expect(OrderApi.preview).toHaveBeenLastCalledWith(
        [{ productId: 1, quantity: 2 }],
        [{ farmerId: 1, date: '2026-10-03' }],
      ),
    );
    expect(await screen.findByText('The deal only applies to Sun 04/10.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('−40% near-expiry deal')).not.toBeInTheDocument());
  });

  /** The deal day has no pickup time left: the picker falls back to the first day and says why. */
  it('says so when the deal day can no longer be picked', async () => {
    addFromDeals('2026-10-10');
    renderCart();

    expect(
      await screen.findByText('The deal day Sat 10/10 can no longer be picked. Choose a day to see its price.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /03\/10/ })).toBeChecked();
  });
});
