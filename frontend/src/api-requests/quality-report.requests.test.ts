import { beforeEach, describe, expect, it, vi } from 'vitest';
import QualityReportApi, { reportPhotoSrc } from './quality-report.requests';
import { privateApi } from '@/utils/axiosInstance';

vi.mock('@/utils/axiosInstance', () => ({
  privateApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

const ok = (data: unknown) => ({ data: { success: true, data } });

describe('QualityReportApi', () => {
  beforeEach(() => {
    vi.mocked(privateApi.get).mockResolvedValue(
      ok({
        standing: { activeViolations: 2, limit: 3, windowDays: 90, extensionLockedUntil: null },
        reports: { items: [], page: 1, pageSize: 1, total: 0 },
      }),
    );
    vi.mocked(privateApi.post).mockResolvedValue(ok({ url: '/uploads/quality-report-photos/1-a.jpg' }));
    vi.mocked(privateApi.put).mockResolvedValue(ok(null));
    vi.mocked(privateApi.patch).mockResolvedValue(ok(null));
  });

  it('reports one line of an order', async () => {
    await QualityReportApi.create(21, 501, { spoiledOn: '2026-10-05', problem: 'mold' });
    expect(privateApi.post).toHaveBeenCalledWith('/orders/21/items/501/quality-report', {
      spoiledOn: '2026-10-05',
      problem: 'mold',
    });
  });

  it('uploads the photo as multipart and returns its address', async () => {
    const url = await QualityReportApi.uploadPhoto(new File(['x'], 'rau.png', { type: 'image/png' }));
    expect(url).toBe('/uploads/quality-report-photos/1-a.jpg');
    expect(privateApi.post).toHaveBeenCalledWith('/quality-reports/photos', expect.any(FormData), {
      headers: { 'Content-Type': undefined },
    });
  });

  it('reads only the standing for the product form and the overview', async () => {
    const standing = await QualityReportApi.standing();
    expect(privateApi.get).toHaveBeenCalledWith('/farmer/quality-reports', { params: { page: 1, pageSize: 1 } });
    expect(standing.activeViolations).toBe(2);
  });

  it("saves the stall's reply", async () => {
    await QualityReportApi.respond(9, 'Khách để nhiệt độ thường');
    expect(privateApi.put).toHaveBeenCalledWith('/farmer/quality-reports/9/response', {
      response: 'Khách để nhiệt độ thường',
    });
  });

  it('asks the admin queue with the filter as the query', async () => {
    await QualityReportApi.adminList({ status: 'open', escalated: true, pageSize: 50 });
    expect(privateApi.get).toHaveBeenCalledWith('/admin/quality-reports', {
      params: { status: 'open', escalated: true, pageSize: 50 },
    });
  });

  it('confirms and dismisses with the note', async () => {
    await QualityReportApi.confirm(9);
    await QualityReportApi.dismiss(9, 'Khách để nhiệt độ thường');
    expect(privateApi.patch).toHaveBeenCalledWith('/admin/quality-reports/9/confirm', { note: undefined });
    expect(privateApi.patch).toHaveBeenCalledWith('/admin/quality-reports/9/dismiss', {
      note: 'Khách để nhiệt độ thường',
    });
  });

  it('turns a stored photo path into the API address', () => {
    expect(reportPhotoSrc('/uploads/quality-report-photos/1-a.jpg')).toMatch(
      /\/uploads\/quality-report-photos\/1-a\.jpg$/,
    );
  });
});
