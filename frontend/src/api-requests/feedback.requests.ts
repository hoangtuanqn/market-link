import type { ApiResponse, PageType } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

export type FeedbackType = 'bug' | 'suggestion' | 'query';

export type FeedbackStatus = 'new' | 'reviewed' | 'resolved';

export type FeedbackDto = {
  id: number;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  createdAt: string;
};

class FeedbackApi {
  static submit = async (input: { type: FeedbackType; message: string }) => {
    const response = await privateApi.post<ApiResponse<FeedbackDto>>('/feedbacks', input);
    return response.data.data;
  };

  static list = async (params: { status?: FeedbackStatus; page?: number; pageSize?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<PageType<FeedbackDto>>>('/admin/feedbacks', { params });
    return response.data.data;
  };

  static setStatus = async (id: number, status: FeedbackStatus) => {
    const response = await privateApi.patch<ApiResponse<FeedbackDto>>(`/admin/feedbacks/${id}/status`, { status });
    return response.data.data;
  };
}

export default FeedbackApi;
