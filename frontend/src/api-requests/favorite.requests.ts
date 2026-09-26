import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

export type FavoriteTargetType = 'farmer' | 'product' | 'market';

/**
 * One favourite as the Favorites screen shows it (contract §9). `available` is false when the target can no longer be
 * bought or visited (sold out, paused, hidden, suspended stall, closed market): show it dimmed.
 */
export type FavoriteDto = {
  id: number;
  targetType: FavoriteTargetType;
  targetId: number;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  available: boolean;
};

/** Send exactly the id that matches `targetType`. */
export type FavoriteInput =
  | { targetType: 'farmer'; farmerId: number }
  | { targetType: 'product'; productId: number }
  | { targetType: 'market'; marketId: number };

/** FR-040, FR-014 — favourite stalls, products and markets of the signed-in customer or farmer (contract §9). */
class FavoriteApi {
  /** Newest first; `targetType` narrows to one tab. 400 `VALIDATION_ERROR` for an unknown type. */
  static list = async (targetType?: FavoriteTargetType) => {
    const response = await privateApi.get<ApiResponse<FavoriteDto[]>>('/favorites', {
      params: targetType ? { targetType } : {},
    });
    return response.data.data;
  };

  /**
   * Idempotent: adding the same target again returns the existing favourite. 404 `NOT_FOUND` when the target is not
   * public; 403 `FORBIDDEN` for admin accounts.
   */
  static add = async (input: FavoriteInput) => {
    const response = await privateApi.post<ApiResponse<FavoriteDto>>('/favorites', input);
    return response.data.data;
  };

  /** 403 `FORBIDDEN` when the favourite belongs to another account. */
  static remove = async (id: number) => {
    await privateApi.delete<ApiResponse<null>>(`/favorites/${id}`);
  };
}

export default FavoriteApi;
