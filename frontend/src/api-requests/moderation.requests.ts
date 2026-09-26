import type { ApiResponse, PageType } from '@/types/api.types';
import type { ReportDetail, ReportListItem, ReportStatus } from '@/types/chat.types';
import { privateApi } from '@/utils/axiosInstance';

/** FR-116 — the admin's message moderation. An admin can only read a message that has been reported (spec §8.3). */
class ModerationApi {
  static reports = async (params: { status?: ReportStatus; page: number; pageSize: number }) => {
    const response = await privateApi.get<ApiResponse<PageType<ReportListItem>>>('/admin/message-reports', {
      params,
    });
    return response.data;
  };

  static report = async (reportId: number) => {
    const response = await privateApi.get<ApiResponse<ReportDetail>>(`/admin/message-reports/${reportId}`);
    return response.data;
  };

  /** Soft-hides a message: both people in the thread see it disappear through the "hidden" event. */
  static hide = async (messageId: number) => {
    const response = await privateApi.patch<ApiResponse<unknown>>(`/admin/messages/${messageId}/hide`);
    return response.data;
  };

  static dismiss = async (reportId: number) => {
    const response = await privateApi.patch<ApiResponse<unknown>>(`/admin/message-reports/${reportId}/dismiss`);
    return response.data;
  };
}

export default ModerationApi;
