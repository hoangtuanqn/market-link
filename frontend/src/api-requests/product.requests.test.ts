import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductApi from './product.requests';
import { privateApi } from '@/utils/axiosInstance';

vi.mock('@/utils/axiosInstance', () => ({
  privateApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  publicApi: { get: vi.fn() },
}));

const ok = (data: unknown) => ({ data: { success: true, message: 'OK', data, timestamp: '' } });

describe('ProductApi', () => {
  beforeEach(() => vi.clearAllMocks());

  /** The instance's 10 s timeout would cut off a large photo on a phone connection. */
  it('uploads a product photo without the default timeout', async () => {
    vi.mocked(privateApi.post).mockResolvedValue(ok({ url: '/u/p.jpg' }));

    await ProductApi.uploadProductImage(new File(['x'], 'p.jpg', { type: 'image/jpeg' }));

    expect(privateApi.post).toHaveBeenCalledWith(
      '/farmer/products/images',
      expect.any(FormData),
      expect.objectContaining({ timeout: 0 }),
    );
  });
});
