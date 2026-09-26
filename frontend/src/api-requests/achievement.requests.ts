import type { AchievementType } from '@/types/achievement.types';
import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

/**
 * The personal achievements of the signed-in user themself (not in the SRS, requested by the LEAD — not in api-contract
 * yet).
 */
class AchievementApi {
  static get = async () => {
    const response = await privateApi.get<ApiResponse<AchievementType>>('/auth/me/achievements');
    return response.data;
  };
}

export default AchievementApi;
