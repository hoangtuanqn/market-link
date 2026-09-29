import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { toOrder, type OrderDetailDto } from '@/api-requests/order.requests';
import type { OrderType } from '@/types/order.types';
import OrderTicket from './OrderTicket';

const order: OrderType = {
  id: 42,
  code: 'ML-20260920-0002',
  farmerId: 4,
  marketId: 1,
  stallName: 'Vườn Út Hiền',
  marketName: 'Chợ Bà Chiểu',
  date: '2026-09-30',
  slot: '06:00–07:00',
  status: 'placed',
  cutoff: '2026-09-29T15:00:00Z',
  items: [],
  itemCount: 2,
  total: 4.5,
  history: [],
};

describe('OrderTicket links (FR-036)', () => {
  it('points at the order by its numeric id, which is what the detail route resolves', () => {
    render(
      <MemoryRouter>
        <OrderTicket order={order} />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toContain('/orders/42');
    expect(links.some((href) => href?.includes('ML-20260920-0002'))).toBe(false);
  });
});

describe('OrderTicket lines (FR-121)', () => {
  it('shows how long each line stays good, and nothing for a line placed before the promise existed', () => {
    const detail = {
      summary: {
        orderId: 42,
        orderCode: 'ML-20260920-0002',
        status: 'placed',
        farmerId: 4,
        stallName: 'Vườn Út Hiền',
        marketId: 1,
        marketName: 'Chợ Bà Chiểu',
        pickupDate: '2026-09-30',
        pickupStart: '06:00',
        pickupEnd: '07:00',
        cutoffAt: '2026-09-29T15:00:00Z',
        totalAmount: 2,
        itemCount: 2,
        createdAt: '2026-09-27T03:00:00Z',
        customerId: 7,
        customerName: 'Khách',
        reviewed: false,
      },
      items: [
        {
          productId: 1,
          productName: 'Rau muống',
          unit: 'bunch',
          unitPrice: 0.5,
          quantity: 2,
          subtotal: 1,
          bestBefore: '2026-10-04',
          storageMode: 'chilled',
        },
        { productId: 2, productName: 'Cải ngọt', unit: 'bunch', unitPrice: 0.5, quantity: 2, subtotal: 1 },
      ],
      statusHistory: [],
      canCancel: true,
      canModify: true,
      customerNote: null,
      farmerNote: null,
      reviewed: false,
    } satisfies OrderDetailDto;

    render(
      <MemoryRouter>
        <OrderTicket order={toOrder(detail)} fluid hideActions />
      </MemoryRouter>,
    );

    expect(screen.getByText('Rau muống').closest('li')).toHaveTextContent(
      'Good until end of Sun 04/10 · Fridge 0–5 °C',
    );
    expect(screen.getByText('Cải ngọt').closest('li')).not.toHaveTextContent('Good until');
  });
});
