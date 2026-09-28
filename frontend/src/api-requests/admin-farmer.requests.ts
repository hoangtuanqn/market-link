import type { ApiResponse, PageType } from '@/types/api.types';
import type { AdminFarmerDetailType, AdminFarmerListItemType, FarmerApproval } from '@/types/farmer.types';
import { privateApi } from '@/utils/axiosInstance';

/** `GET /admin/farmers/{id}/status-history` row (FR-071). `changedByName` null = the system (auto-reinstate). */
export type AdminFarmerStatusHistoryDto = {
  id: number;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
  until: string | null;
  changedByName: string | null;
  changedAt: string;
};

/** §6, §7, §8 — Admin views, approves, suspends a Farmer. */
class AdminFarmerApi {
  static list = async (params: { status?: FarmerApproval | 'all'; q?: string; page?: number; pageSize?: number }) => {
    const queryParams = {
      ...params,
      status: params.status === 'all' ? undefined : params.status,
    };
    const response = await privateApi.get<ApiResponse<PageType<AdminFarmerListItemType>>>('/admin/farmers', {
      params: queryParams,
    });
    return response.data;
  };

  static detail = async (id: number) => {
    const response = await privateApi.get<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}`);
    return response.data;
  };

  /** §7: only a `pending` profile can be approved. */
  static approve = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}/approve`);
    return response.data;
  };

  /** Docs/prototype/admin/farmers.html — only a `pending` profile can be rejected. */
  static reject = async (id: number, reason: string) => {
    const response = await privateApi.patch<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}/reject`, {
      reason,
    });
    return response.data;
  };

  /**
   * §8 D-09: only an `approved` profile can be suspended; the reason is shown back to the Farmer themself. `until` null
   * = stays suspended until an admin reinstates it; otherwise it lifts on its own (a cron reinstates).
   */
  static suspend = async (id: number, reason: string, until: string | null = null) => {
    const response = await privateApi.patch<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}/suspend`, {
      reason,
      until,
    });
    return response.data;
  };

  /** Docs/prototype/admin/farmers.html "Reinstate" — only a `suspended` profile goes back to `approved`. */
  static reinstate = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}/reinstate`);
    return response.data;
  };

  /** `GET /admin/farmers/{id}/status-history`: every suspend/reinstate on this stall, newest first. */
  static statusHistory = async (id: number, page = 1, pageSize = 20) => {
    const response = await privateApi.get<ApiResponse<PageType<AdminFarmerStatusHistoryDto>>>(
      `/admin/farmers/${id}/status-history`,
      { params: { page, pageSize } },
    );
    return response.data.data;
  };
}

export default AdminFarmerApi;
