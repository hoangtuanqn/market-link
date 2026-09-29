import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FarmerOrdersPage from './index';
import OrderApi, { type OrderListItemDto } from '@/api-requests/order.requests';

vi.mock('@/api-requests/order.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/order.requests')>();
  return { ...real, default: { farmerList: vi.fn(), accept: vi.fn() } };
});

const placed: OrderListItemDto = {
  orderId: 42,
  orderCode: 'ML-20260930-0001',
  status: 'placed',
  farmerId: 4,
  stallName: 'Vườn Út Hiền',
  marketId: 1,
  marketName: 'Chợ Bà Chiểu',
  pickupDate: '2026-10-03',
  pickupStart: '07:00',
  pickupEnd: '08:00',
  cutoffAt: '2026-10-02T12:00:00Z',
  totalAmount: 2,
  itemCount: 1,
  createdAt: '2026-09-29T03:00:00Z',
  customerId: 7,
  customerName: 'Khách',
  reviewed: false,
};

const conflict = () =>
  new AxiosError('conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { success: false, message: 'The customer cancelled this order.' },
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(OrderApi.farmerList).mockResolvedValue({ items: [placed], page: 1, pageSize: 50, total: 1 } as never);
});

describe('FarmerOrdersPage', () => {
  it('reads the list again after an action answers 409', async () => {
    vi.mocked(OrderApi.accept).mockRejectedValue(conflict());
    render(
      <MemoryRouter>
        <FarmerOrdersPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(OrderApi.farmerList).toHaveBeenCalledTimes(2));
  });

  it('does not read the list again after another error', async () => {
    vi.mocked(OrderApi.accept).mockRejectedValue(new Error('Network Error'));
    render(
      <MemoryRouter>
        <FarmerOrdersPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(OrderApi.accept).toHaveBeenCalled());
    expect(OrderApi.farmerList).toHaveBeenCalledTimes(1);
  });
});
