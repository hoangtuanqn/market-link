import { beforeEach, describe, expect, it, vi } from 'vitest';
import FarmerApi from './farmer.requests';
import { privateApi } from '@/utils/axiosInstance';

vi.mock('@/utils/axiosInstance', () => ({
  privateApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  publicApi: { get: vi.fn() },
}));

const ok = (data: unknown) => ({ data: { success: true, message: 'OK', data, timestamp: '' } });

describe('FarmerApi', () => {
  beforeEach(() => vi.clearAllMocks());

  /** The instance's 10 s timeout would cut off a 40 MB video on a phone connection. */
  it('uploads a Farmer application video without the default timeout', async () => {
    vi.mocked(privateApi.post).mockResolvedValue(ok({ url: '/u/v.mp4' }));

    await FarmerApi.uploadFile(new File(['x'], 'v.mp4', { type: 'video/mp4' }), 'video');

    expect(privateApi.post).toHaveBeenCalledWith(
      '/farmer/apply/uploads',
      expect.any(FormData),
      expect.objectContaining({ params: { kind: 'video' }, timeout: 0 }),
    );
  });
});
