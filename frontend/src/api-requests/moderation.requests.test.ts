import { beforeEach, describe, expect, it, vi } from 'vitest';
import ModerationApi from './moderation.requests';
import { privateApi } from '@/utils/axiosInstance';

vi.mock('@/utils/axiosInstance', () => ({
  privateApi: { get: vi.fn(), patch: vi.fn() },
}));

describe('ModerationApi', () => {
  beforeEach(() => {
    vi.mocked(privateApi.get).mockResolvedValue({ data: { success: true, data: null } });
    vi.mocked(privateApi.patch).mockResolvedValue({ data: { success: true, data: null } });
  });

  it('lists reports by status', async () => {
    await ModerationApi.reports({ status: 'new', page: 1, pageSize: 20 });
    expect(privateApi.get).toHaveBeenCalledWith('/admin/message-reports', {
      params: { status: 'new', page: 1, pageSize: 20 },
    });
  });

  it('opens one report with its context', async () => {
    await ModerationApi.report(9);
    expect(privateApi.get).toHaveBeenCalledWith('/admin/message-reports/9');
  });

  it('hides the message, not the report', async () => {
    await ModerationApi.hide(55);
    expect(privateApi.patch).toHaveBeenCalledWith('/admin/messages/55/hide');
  });

  it('dismisses the report', async () => {
    await ModerationApi.dismiss(9);
    expect(privateApi.patch).toHaveBeenCalledWith('/admin/message-reports/9/dismiss');
  });
});
