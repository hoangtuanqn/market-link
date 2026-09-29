import type { ApiResponse, PageType } from '@/types/api.types';
import type { AdminFarmerDetailType, AdminFarmerListItemType, FarmerApproval } from '@/types/farmer.types';
import { privateApi } from '@/utils/axiosInstance';

export type AdminFarmerStatusHistoryDto = {
  id: number;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
  until: string | null;
  changedByName: string | null;
  changedAt: string;
};

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

  static approve = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}/approve`);
    return response.data;
  };

  static reject = async (id: number, reason: string) => {
    const response = await privateApi.patch<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}/reject`, {
      reason,
    });
    return response.data;
  };

  static suspend = async (id: number, reason: string, until: string | null = null) => {
    const response = await privateApi.patch<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}/suspend`, {
      reason,
      until,
    });
    return response.data;
  };

  static reinstate = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<AdminFarmerDetailType>>(`/admin/farmers/${id}/reinstate`);
    return response.data;
  };

  static statusHistory = async (id: number, page = 1, pageSize = 20) => {
    const response = await privateApi.get<ApiResponse<PageType<AdminFarmerStatusHistoryDto>>>(
      `/admin/farmers/${id}/status-history`,
      { params: { page, pageSize } },
    );
    return response.data.data;
  };
}

export default AdminFarmerApi;
