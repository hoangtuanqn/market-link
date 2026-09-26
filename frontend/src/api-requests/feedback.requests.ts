import type { ApiResponse, PageType } from '@/types/api.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';

/** FR-081 — the three kinds the form offers (contract §11). */
export type FeedbackType = 'bug' | 'suggestion' | 'query';

/** Admin queue state: every submission starts `new`. */
export type FeedbackStatus = 'new' | 'reviewed' | 'resolved';

/**
 * One submission as the admin queue returns it. `userId`/`userName`/`userEmail` are `null` for a visitor who was not
 * signed in; `createdAt` is ISO 8601 UTC.
 */
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

/** FR-081 — feedback form (public) and the admin queue (docs/api-contract.md §11). */
class FeedbackApi {
  /**
   * Anyone can send; a signed-in user is attached automatically. `message` 10–2000 characters (same rule on the
   * server). 400 `VALIDATION_ERROR` per field, 429 `RATE_LIMITED` after 5 submissions an hour from one address.
   */
  static submit = async (input: { type: FeedbackType; message: string }) => {
    const response = await publicApi.post<ApiResponse<FeedbackDto>>('/feedbacks', input);
    return response.data.data;
  };

  /** Admin queue, newest first; `status` filters one state. `page` starts at 1. */
  static list = async (params: { status?: FeedbackStatus; page?: number; pageSize?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<PageType<FeedbackDto>>>('/admin/feedbacks', { params });
    return response.data.data;
  };

  /** Admin moves a submission between `new`, `reviewed` and `resolved`. */
  static setStatus = async (id: number, status: FeedbackStatus) => {
    const response = await privateApi.patch<ApiResponse<FeedbackDto>>(`/admin/feedbacks/${id}/status`, { status });
    return response.data.data;
  };
}

export default FeedbackApi;
