import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerOrderEditPage from './index';
import OrderApi, { type OrderDetailDto } from '@/api-requests/order.requests';

vi.mock('@/api-requests/order.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/order.requests')>();
  return { ...real, default: { get: vi.fn(), modifyItems: vi.fn() } };
});

const detail = {
  summary: {
    orderId: 21,
    orderCode: 'ML-20260920-0001',
    status: 'placed',
    farmerId: 15,
    stallName: 'Vườn Út Hiền',
    marketId: 1,
    marketName: 'Thảo Điền Weekend Market',
    pickupDate: '2026-10-03',
    pickupStart: '07:00',
    pickupEnd: '08:00',
    cutoffAt: '2099-10-02T12:00:00Z',
    totalAmount: 2.3,
    itemCount: 2,
    createdAt: '2026-09-20T01:00:00Z',
  },
  items: [
    { productId: 3, productName: 'Water spinach', unit: 'bunch', unitPrice: 0.5, quantity: 3, subtotal: 1.5 },
    { productId: 4, productName: 'Cherry tomatoes', unit: 'kg', unitPrice: 0.8, quantity: 1, subtotal: 0.8 },
  ],
  statusHistory: [],
  canCancel: true,
  canModify: true,
  customerNote: null,
  farmerNote: null,
  customer: null,
  reviewed: false,
} as unknown as OrderDetailDto;

const renderEdit = () =>
  render(
    <MemoryRouter initialEntries={['/orders/21/edit']}>
      <Routes>
        <Route path="/orders/:code/edit" element={<CustomerOrderEditPage />} />
        <Route path="/orders/:code" element={<p>order page</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(OrderApi.get).mockReset().mockResolvedValue(detail);
  vi.mocked(OrderApi.modifyItems).mockReset().mockResolvedValue(detail);
});

describe('CustomerOrderEditPage', () => {
  /**
   * PUT /orders/{id}/items only takes the items (contract §7): a note field here would be thrown away without a word,
   * so the page must not offer one — least of all one pre-filled with sample text.
   */
  it('offers no note the server cannot store', async () => {
    renderEdit();

    await screen.findByRole('button', { name: 'Send changes for approval' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('sends only the edited quantities', async () => {
    renderEdit();

    await userEvent.click(await screen.findByRole('button', { name: 'Send changes for approval' }));

    expect(OrderApi.modifyItems).toHaveBeenCalledWith(21, [
      { productId: 3, quantity: 3 },
      { productId: 4, quantity: 1 },
    ]);
  });
});
