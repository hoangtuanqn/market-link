import type { ApiResponse, PageType } from '@/types/api.types';
import type { AdminFarmerDetailType, AdminFarmerListItemType, FarmerApproval } from '@/types/farmer.types';
import { privateApi } from '@/utils/axiosInstance';

/** §6, §7, §8 — Admin xem, duyệt, đình chỉ Farmer. */
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

  /** §7: chỉ hồ sơ `pending` mới duyệt được. */
  static approve = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}/approve`);
    return response.data;
  };

  /** Docs/prototype/admin/farmers.html — chỉ hồ sơ `pending` mới từ chối được. */
  static reject = async (id: number, reason: string) => {
    const response = await privateApi.patch<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}/reject`, {
      reason,
    });
    return response.data;
  };

  /** §8 D-09: chỉ hồ sơ `approved` mới đình chỉ được; lý do hiện lại cho chính Farmer. */
  static suspend = async (id: number, reason: string) => {
    const response = await privateApi.patch<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}/suspend`, {
      reason,
    });
    return response.data;
  };

  /** Docs/prototype/admin/farmers.html "Reinstate" — chỉ hồ sơ `suspended` mới quay lại `approved`. */
  static reinstate = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}/reinstate`);
    return response.data;
  };
}

export default AdminFarmerApi;
