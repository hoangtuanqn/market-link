import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchOrderSummary } from './orderSummary';
import { privateApi } from '@/utils/axiosInstance';

vi.mock('@/utils/axiosInstance', () => ({ privateApi: { get: vi.fn() } }));

const summary = {
  orderId: 21,
  orderCode: 'ML-0421',
  status: 'accepted',
  farmerId: 30,
  stallName: 'Cô Tư Garden',
  marketId: 1,
  marketName: 'Thảo Điền Weekend Market',
  pickupDate: '2026-09-27',
  pickupStart: '07:00',
  pickupEnd: '07:30',
  totalAmount: 56000,
  cutoffAt: '2026-09-26T12:00:00Z',
  itemCount: 3,
  createdAt: '2026-09-25T02:00:00Z',
};

describe('fetchOrderSummary', () => {
  beforeEach(() => {
    vi.mocked(privateApi.get).mockResolvedValue({ data: { success: true, data: { summary, items: [] } } });
  });

  /** Contract §6: GET /orders/{id} (the buyer or the stall owner; anyone else 403). Chat only needs the summary. */
  it('reads the summary of the order', async () => {
    const result = await fetchOrderSummary(21);

    expect(privateApi.get).toHaveBeenCalledWith('/orders/21');
    expect(result).toEqual(summary);
  });
});
