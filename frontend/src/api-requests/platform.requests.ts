import type { ApiResponse } from '@/types/api.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';

export type PlatformStatusType = {
  maintenanceMode: boolean;
};

class PlatformApi {
  static status = async () => {
    const response = await publicApi.get<ApiResponse<PlatformStatusType>>('/platform/status');
    return response.data;
  };

  static setMaintenanceMode = async (maintenanceMode: boolean) => {
    const response = await privateApi.put<ApiResponse<PlatformStatusType>>('/admin/platform/status', {
      maintenanceMode,
    });
    return response.data;
  };
}

export default PlatformApi;
