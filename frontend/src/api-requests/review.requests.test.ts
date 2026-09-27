import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewApi, { toReviewCard } from './review.requests';
import { privateApi, publicApi } from '@/utils/axiosInstance';

vi.mock('@/utils/axiosInstance', () => ({
  privateApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  publicApi: { get: vi.fn() },
}));

describe('toReviewCard', () => {
  it('formats the date and turns the stall response into a reply', () => {
    const card = toReviewCard(
      {
        id: 1,
        targetType: 'product',
        targetId: 5,
        targetName: 'Rau muống',
        customerName: 'An',
        rating: 4,
        comment: 'ok',
        createdAt: '2026-09-17T03:00:00Z',
        response: { id: 9, responseText: 'Thanks', createdAt: '2026-09-17T06:00:00Z' },
      },
      'Vườn Út Hiền',
    );

    expect(card).toMatchObject({
      id: 1,
      author: 'An',
      target: 'Rau muống',
      rating: 4,
      text: 'ok',
      reply: { by: 'Vườn Út Hiền', text: 'Thanks' },
    });
  });

  it('leaves reply undefined when the stall has not answered yet', () => {
    const card = toReviewCard(
      {
        id: 2,
        targetType: 'farmer',
        targetId: 7,
        targetName: 'Vườn Út Hiền',
        customerName: 'Bình',
        rating: 5,
        comment: null,
        createdAt: '2026-09-18T00:00:00Z',
        response: null,
      },
      'Vườn Út Hiền',
    );

    expect(card.reply).toBeUndefined();
    expect(card.text).toBe('');
  });
});

describe('ReviewApi', () => {
  beforeEach(() => {
    vi.mocked(privateApi.get).mockResolvedValue({ data: { success: true, data: null } });
    vi.mocked(publicApi.get).mockResolvedValue({ data: { success: true, data: null } });
  });

  it('mine reads the caller stall review inbox', async () => {
    await ReviewApi.mine({ page: 2, pageSize: 20 });
    expect(privateApi.get).toHaveBeenCalledWith('/farmer/reviews', { params: { page: 2, pageSize: 20 } });
  });

  it('adminList filters the moderation queue', async () => {
    await ReviewApi.adminList({ status: 'hidden', maxRating: 2, customerId: 3, page: 1, pageSize: 20 });
    expect(privateApi.get).toHaveBeenCalledWith('/admin/reviews', {
      params: { status: 'hidden', maxRating: 2, customerId: 3, page: 1, pageSize: 20 },
    });
  });
});
