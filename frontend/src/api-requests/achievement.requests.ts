import type { AchievementType } from '@/types/achievement.types';
import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

class AchievementApi {
  static get = async () => {
    const response = await privateApi.get<ApiResponse<AchievementType>>('/auth/me/achievements');
    return response.data;
  };
}

export default AchievementApi;
