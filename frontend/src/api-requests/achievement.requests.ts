import type { AchievementType } from '@/types/achievement.types';
import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

/** Thành tích cá nhân của chính user đang đăng nhập (không có trong SRS, LEAD yêu cầu — chưa có trong api-contract). */
class AchievementApi {
  static get = async () => {
    const response = await privateApi.get<ApiResponse<AchievementType>>('/auth/me/achievements');
    return response.data;
  };
}

export default AchievementApi;
