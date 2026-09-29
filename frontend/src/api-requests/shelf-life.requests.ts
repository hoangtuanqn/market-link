import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

export type StorageMode = 'room' | 'chilled';

export type ShelfLifeModeDto = {
  guideId: number;
  storageMode: StorageMode;
  suggestedDays: number;
  peerMedianDays: number | null;
  peerCount: number;
};

export type ShelfLifeGroupDto = { groupName: string; examples: string; modes: ShelfLifeModeDto[] };

export type ShelfLifeGuideDto = {
  id: number;
  categoryId: number;
  groupName: string;
  examples: string;
  storageMode: StorageMode;
  suggestedDays: number;
  isActive: boolean;
};

export type ShelfLifeGuideInput = {
  categoryId: number;
  groupName: string;
  examples?: string;
  storageMode: StorageMode;
  suggestedDays: number;
  active?: boolean;
};

export type ShelfLifeDto = {
  guideId: number | null;
  groupName: string | null;
  storageMode: StorageMode;
  days: number;
  suggestedDays: number | null;
  extended: boolean;
};

class ShelfLifeApi {
  static forCategory = async (categoryId: number) => {
    const response = await privateApi.get<ApiResponse<ShelfLifeGroupDto[]>>('/shelf-life-guides', {
      params: { categoryId },
    });
    return response.data.data;
  };

  static adminList = async (categoryId: number) => {
    const response = await privateApi.get<ApiResponse<ShelfLifeGuideDto[]>>('/admin/shelf-life-guides', {
      params: { categoryId },
    });
    return response.data.data;
  };

  static adminCreate = async (input: ShelfLifeGuideInput) => {
    const response = await privateApi.post<ApiResponse<ShelfLifeGuideDto>>('/admin/shelf-life-guides', input);
    return response.data.data;
  };

  static adminUpdate = async (id: number, input: ShelfLifeGuideInput) => {
    const response = await privateApi.put<ApiResponse<ShelfLifeGuideDto>>(`/admin/shelf-life-guides/${id}`, input);
    return response.data.data;
  };

  static adminDeactivate = async (id: number) => {
    await privateApi.delete<ApiResponse<null>>(`/admin/shelf-life-guides/${id}`);
  };
}

export default ShelfLifeApi;
