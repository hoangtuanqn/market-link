import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerCartPage from './index';
import OrderApi from '@/api-requests/order.requests';
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
    expect(place).toBeEnabled();

    await userEvent.click(place);
    expect(OrderApi.place).toHaveBeenCalledWith([
      expect.objectContaining({ farmerId: 1, marketId: 1, slotId: 11, pickupDate: '2026-10-03' }),
    ]);
  });
});
