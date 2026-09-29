import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerCartPage from './index';
import OrderApi, { type OrderGroupPreviewDto, type PreviewItemDto } from '@/api-requests/order.requests';
import StallApi, { type SlotDto } from '@/api-requests/stall.requests';
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

const slot = (
  slotId: number,
  slotDate: string,
  startTime: string,
  endTime: string,
  extra: Partial<SlotDto> = {},
): SlotDto => ({
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
  ...extra,
});

const FULL: Partial<SlotDto> = { bookedCount: 5, isFull: true };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-30T09:00:00+07:00'));
  vi.clearAllMocks();
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
  ]);
  vi.mocked(OrderApi.place).mockResolvedValue([] as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CustomerCartPage', () => {
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

  it('stops the note at 255 characters, the most the server keeps', async () => {
    renderCart();

    expect(await screen.findByLabelText('Note to the stalls')).toHaveAttribute('maxLength', '255');
  });

  it('reloads the slots after placing fails and does not place a time that is now full', async () => {
    vi.mocked(StallApi.slots).mockResolvedValue([
      slot(11, '2026-10-03', '07:00', '08:00'),
      slot(13, '2026-10-03', '08:00', '09:00'),
    ]);
    vi.mocked(OrderApi.place).mockRejectedValueOnce(new Error('SLOT_FULL'));
    renderCart();
    await userEvent.click(await screen.findByRole('radio', { name: /07:00/ }));
    const place = screen.getByRole('button', { name: 'Place 1 order' });
    await waitFor(() => expect(place).toBeEnabled());

    vi.mocked(StallApi.slots).mockResolvedValue([
      slot(11, '2026-10-03', '07:00', '08:00', FULL),
      slot(13, '2026-10-03', '08:00', '09:00'),
    ]);
    await userEvent.click(place);

    await waitFor(() => expect(StallApi.slots).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Choose a pickup time at Vườn Út Hiền to place your orders.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /07:00/ })).toBeDisabled();
  });
});

const renderCart = () =>
  render(
    <MemoryRouter>
      <CustomerCartPage />
    </MemoryRouter>,
  );

const priced = (item: Partial<PreviewItemDto>): OrderGroupPreviewDto[] => [
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

const atTwoMarkets = (groups: OrderGroupPreviewDto[]): OrderGroupPreviewDto[] =>
  groups.map((g) => ({
    ...g,
    marketId: null,
    marketName: null,
    markets: [
      { marketId: 1, marketName: 'Chợ Bà Chiểu' },
      { marketId: 2, marketName: 'Chợ Tân Định' },
    ],
  }));

const DEAL = { unitPrice: 0.3, listPrice: 0.5, discountPercent: 40, bestBefore: '2026-10-05' };

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

const pricedDays = () =>
  vi.mocked(OrderApi.preview).mock.calls.flatMap(([, dates]) => (dates ?? []).map((d) => d.date));

describe('CustomerCartPage — near-expiry deals (FR-125)', () => {
  it('starts a stall on the day its line was added for, priced for that day', async () => {
    addFromDeals('2026-10-04');
    vi.mocked(OrderApi.preview).mockResolvedValue(priced({ ...DEAL, storageMode: 'chilled' }));
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
    vi.mocked(OrderApi.preview).mockImplementation(async (_items, dates) =>
      dates?.[0]?.date === '2026-10-03' ? priced({ unitPrice: 0.5 }) : priced(DEAL),
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

  it('says so when the deal day can no longer be picked', async () => {
    addFromDeals('2026-10-10');
    renderCart();

    expect(
      await screen.findByText('The deal day Sat 10/10 can no longer be picked. Choose a day to see its price.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /03\/10/ })).toBeChecked();
  });

  it('starts a stall at two markets on the one that still has the deal day', async () => {
    addFromDeals('2026-09-30');
    vi.mocked(StallApi.slots).mockResolvedValue([
      slot(21, '2026-09-30', '07:00', '08:00', { marketId: 2, farmerMarketId: 2 }),
      slot(11, '2026-10-01', '07:00', '08:00'),
      slot(22, '2026-10-01', '07:00', '08:00', { marketId: 2, farmerMarketId: 2 }),
    ]);
    vi.mocked(OrderApi.preview).mockResolvedValue(atTwoMarkets(priced({ ...DEAL, bestBefore: '2026-10-01' })));
    renderCart();

    expect(await screen.findByRole('radio', { name: /30\/09/ })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Market' })).toHaveValue('2');
    expect(StallApi.slots).toHaveBeenCalledWith(1);
    expect(OrderApi.preview).toHaveBeenCalledWith(
      [{ productId: 1, quantity: 2 }],
      [{ farmerId: 1, date: '2026-09-30' }],
    );
    expect(screen.getByText('−40% near-expiry deal')).toBeInTheDocument();
    expect(screen.queryByText(/can no longer be picked/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: /07:00/ }));
    const place = screen.getByRole('button', { name: 'Place 1 order' });
    await waitFor(() => expect(place).toBeEnabled());
    await userEvent.click(place);
    expect(OrderApi.place).toHaveBeenCalledWith([
      expect.objectContaining({ farmerId: 1, marketId: 2, slotId: 21, pickupDate: '2026-09-30' }),
    ]);
  });

  it('tells a second deal line of the stall right away that its deal is for another day', async () => {
    addFromDeals('2026-10-03');
    Cart.add(
      {
        productId: 2,
        name: 'Cải ngọt',
        unit: 'bunch',
        price: 0.4,
        max: 10,
        farmerId: 1,
        stallName: 'Vườn Út Hiền',
        pickupDate: '2026-10-04',
      },
      1,
    );
    const [group] = priced({ ...DEAL, bestBefore: '2026-10-04' });
    vi.mocked(OrderApi.preview).mockResolvedValue([
      {
        ...group,
        items: [
          ...group.items,
          {
            productId: 2,
            name: 'Cải ngọt',
            unit: 'bunch',
            unitPrice: 0.8,
            quantity: 1,
            subtotal: 0.8,
            stockQuantity: 10,
            status: 'available',
          },
        ],
      },
    ]);
    renderCart();

    expect(await screen.findByText('The deal only applies to Sun 04/10.')).toBeInTheDocument();
    expect(screen.getByText('−40% near-expiry deal')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /03\/10/ })).toBeChecked();
    expect(OrderApi.preview).toHaveBeenCalledWith(
      [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ],
      [{ farmerId: 1, date: '2026-10-03' }],
    );
  });

  it('ignores a remembered deal day that has passed', async () => {
    addFromDeals('2026-09-29');
    renderCart();

    expect(await screen.findByRole('radio', { name: /03\/10/ })).toBeChecked();
    expect(OrderApi.preview).toHaveBeenCalledWith(
      [{ productId: 1, quantity: 2 }],
      [{ farmerId: 1, date: '2026-10-03' }],
    );
    expect(pricedDays()).not.toContain('2026-09-29');
    expect(screen.queryByText(/can no longer be picked/)).not.toBeInTheDocument();
    expect(screen.queryByText(/The deal only applies/)).not.toBeInTheDocument();
  });

  it('prices a stall whose deal day is fully booked for its first day with a free time', async () => {
    addFromDeals('2026-10-04');
    vi.mocked(StallApi.slots).mockResolvedValue([
      slot(11, '2026-10-03', '07:00', '08:00'),
      slot(12, '2026-10-04', '07:00', '08:00', FULL),
    ]);
    renderCart();

    expect(
      await screen.findByText('The deal day Sun 04/10 can no longer be picked. Choose a day to see its price.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /03\/10/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /04\/10/ })).not.toBeChecked();
    expect(OrderApi.preview).toHaveBeenCalledWith(
      [{ productId: 1, quantity: 2 }],
      [{ farmerId: 1, date: '2026-10-03' }],
    );
    expect(pricedDays()).not.toContain('2026-10-04');
  });

  it('keeps the stall on its last bookable day when a fully booked day is clicked', async () => {
    vi.mocked(StallApi.slots).mockResolvedValue([
      slot(11, '2026-10-03', '07:00', '08:00'),
      slot(12, '2026-10-04', '07:00', '08:00', FULL),
    ]);
    renderCart();

    await userEvent.click(await screen.findByRole('radio', { name: /04\/10/ }));

    expect(screen.getByRole('radio', { name: /04\/10/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /07:00/ })).toBeDisabled();
    expect(screen.getByText('Fully booked')).toBeInTheDocument();
    expect(pricedDays()).not.toContain('2026-10-04');
    expect(OrderApi.preview).toHaveBeenLastCalledWith(
      [{ productId: 1, quantity: 2 }],
      [{ farmerId: 1, date: '2026-10-03' }],
    );
    expect(screen.getByRole('button', { name: 'Place 1 order' })).toBeDisabled();
  });

  it('starts a stall with no deal on its first day with a free time, priced for that day', async () => {
    vi.mocked(StallApi.slots).mockResolvedValue([
      slot(11, '2026-10-03', '07:00', '08:00', FULL),
      slot(12, '2026-10-04', '07:00', '08:00'),
    ]);
    renderCart();

    expect(await screen.findByRole('radio', { name: /04\/10/ })).toBeChecked();
    expect(OrderApi.preview).toHaveBeenCalledWith(
      [{ productId: 1, quantity: 2 }],
      [{ farmerId: 1, date: '2026-10-04' }],
    );
  });
});
