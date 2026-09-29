import type { Settings } from '@/lib/settings';
import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

class SettingsApi {
  static get = async () => {
    const response = await privateApi.get<ApiResponse<Settings | null>>('/auth/me/settings');
    return response.data;
  };

  static save = async (settings: Settings) => {
    const response = await privateApi.put<ApiResponse<Settings>>('/auth/me/settings', {
      ...settings,
      preferredMarket: settings.preferredMarket || null,
    });
    return response.data;
  };
}

export default SettingsApi;
