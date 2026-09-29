import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerOrderEditPage from './index';
import OrderApi, { type OrderDetailDto, type OrderGroupPreviewDto } from '@/api-requests/order.requests';

vi.mock('@/api-requests/order.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/order.requests')>();
  return { ...real, default: { get: vi.fn(), modifyItems: vi.fn(), preview: vi.fn() } };
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

const leftForTheDay = [
  {
    farmerId: 15,
    stallName: 'Vườn Út Hiền',
    marketId: 1,
    marketName: 'Thảo Điền Weekend Market',
    orderCutoffHours: 12,
    items: [
      {
        productId: 3,
        name: 'Water spinach',
        unit: 'bunch',
        unitPrice: 0.5,
        quantity: 3,
        subtotal: 1.5,
        stockQuantity: 2,
        status: 'available',
      },
      {
        productId: 4,
        name: 'Cherry tomatoes',
        unit: 'kg',
        unitPrice: 0.8,
        quantity: 1,
        subtotal: 0.8,
        stockQuantity: 0,
        status: 'sold_out',
      },
    ],
    subtotal: 2.3,
    problems: ['out_of_stock'],
    markets: [{ marketId: 1, marketName: 'Thảo Điền Weekend Market' }],
  },
] as OrderGroupPreviewDto[];

beforeEach(() => {
  vi.mocked(OrderApi.get).mockReset().mockResolvedValue(detail);
  vi.mocked(OrderApi.modifyItems).mockReset().mockResolvedValue(detail);
  vi.mocked(OrderApi.preview).mockReset().mockResolvedValue(leftForTheDay);
});

describe('CustomerOrderEditPage', () => {
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

  it('lets a line go up only by what the stall still has for the pickup day', async () => {
    renderEdit();

    const [spinachUp, tomatoesUp] = await screen.findAllByRole('button', { name: 'Increase by 1' });
    expect(OrderApi.preview).toHaveBeenCalledWith(
      [
        { productId: 3, quantity: 3 },
        { productId: 4, quantity: 1 },
      ],
      [{ farmerId: 15, date: '2026-10-03' }],
    );
    await waitFor(() => expect(spinachUp).toBeEnabled());
    expect(tomatoesUp).toBeDisabled();
    await userEvent.click(spinachUp);
    await userEvent.click(spinachUp);
    expect(spinachUp).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Send changes for approval' }));
    expect(OrderApi.modifyItems).toHaveBeenCalledWith(21, [
      { productId: 3, quantity: 5 },
      { productId: 4, quantity: 1 },
    ]);
  });

  it('only lets lines go down while it cannot tell what is left', async () => {
    vi.mocked(OrderApi.preview).mockRejectedValue(new Error('Network Error'));
    renderEdit();

    await screen.findByRole('button', { name: 'Send changes for approval' });
    await waitFor(() => expect(OrderApi.preview).toHaveBeenCalled());
    for (const up of screen.getAllByRole('button', { name: 'Increase by 1' })) expect(up).toBeDisabled();
    expect(screen.getByText(/A line can go up by what Vườn Út Hiền still has for this pickup day/)).toBeInTheDocument();
  });
});
