import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

export type FavoriteTargetType = 'farmer' | 'product' | 'market';

export type FavoriteDto = {
  id: number;
  targetType: FavoriteTargetType;
  targetId: number;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  available: boolean;
};

export type FavoriteInput =
  | { targetType: 'farmer'; farmerId: number }
  | { targetType: 'product'; productId: number }
  | { targetType: 'market'; marketId: number };

class FavoriteApi {
  static list = async (targetType?: FavoriteTargetType) => {
    const response = await privateApi.get<ApiResponse<FavoriteDto[]>>('/favorites', {
      params: targetType ? { targetType } : {},
    });
    return response.data.data;
  };

  static add = async (input: FavoriteInput) => {
    const response = await privateApi.post<ApiResponse<FavoriteDto>>('/favorites', input);
    return response.data.data;
  };

  static remove = async (id: number) => {
    await privateApi.delete<ApiResponse<null>>(`/favorites/${id}`);
  };
}

export default FavoriteApi;
