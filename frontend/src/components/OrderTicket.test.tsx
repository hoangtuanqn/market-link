import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
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

    // The detail, edit and review pages all read the route param as a number; the order code is for
    // display only. A link built from the code lands on "That order is not here any more".
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toContain('/orders/42');
    expect(links.some((href) => href?.includes('ML-20260920-0002'))).toBe(false);
  });
});
