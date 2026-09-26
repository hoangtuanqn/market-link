import type { ApiResponse, PageType } from '@/types/api.types';
import type { AdminFarmerDetailType, AdminFarmerListItemType, FarmerApproval } from '@/types/farmer.types';
import { privateApi } from '@/utils/axiosInstance';

/** §6, §7, §8 — Admin views, approves, suspends a Farmer. */
class AdminFarmerApi {
  static list = async (params: { status?: FarmerApproval; q?: string; page?: number; pageSize?: number }) => {
    const response = await privateApi.get<ApiResponse<PageType<AdminFarmerListItemType>>>('/admin/farmers', {
      params,
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

  /** §8 D-09: only an `approved` profile can be suspended; the reason is shown back to the Farmer themself. */
  static suspend = async (id: number, reason: string) => {
    const response = await privateApi.patch<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}/suspend`, {
      reason,
    });
    return response.data;
  };

  /** Docs/prototype/admin/farmers.html "Reinstate" — only a `suspended` profile goes back to `approved`. */
  static reinstate = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}/reinstate`);
    return response.data;
  };
}

export default AdminFarmerApi;
