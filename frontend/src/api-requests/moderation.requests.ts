import type { ApiResponse, PageType } from '@/types/api.types';
import type { ReportDetail, ReportListItem, ReportStatus } from '@/types/chat.types';
import { privateApi } from '@/utils/axiosInstance';

/** FR-116 — kiểm duyệt tin nhắn của admin. Admin chỉ đọc được tin đã bị báo cáo (spec §8.3). */
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

  /** Ẩn mềm tin nhắn: cả hai người trong thread thấy nó biến mất qua sự kiện "hidden". */
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
