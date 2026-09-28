import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

/** FR-120: how a product is kept until it is used. */
export type StorageMode = 'room' | 'chilled';

/** One way of keeping a group, as the product form offers it. */
export type ShelfLifeModeDto = {
  guideId: number;
  storageMode: StorageMode;
  suggestedDays: number;
  /** What other stalls set; null until at least three of their products use this guide. */
  peerMedianDays: number | null;
  peerCount: number;
};

/** One storage group of a category, room before chilled. */
export type ShelfLifeGroupDto = { groupName: string; examples: string; modes: ShelfLifeModeDto[] };

/** One guide row as the admin manages it. */
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
  /** Omitted: stays as it is on update, on when creating. */
  active?: boolean;
};

/** A product's shelf life as stored (FR-121). `guideId` null = the category's range was used. */
export type ShelfLifeDto = {
  guideId: number | null;
  groupName: string | null;
  storageMode: StorageMode;
  days: number;
  suggestedDays: number | null;
  extended: boolean;
};

/** FR-120 — shelf-life guides (docs/api-contract.md §5, §10). */
class ShelfLifeApi {
  /** Farmer (and Admin): the active groups of one category, with what other stalls set. */
  static forCategory = async (categoryId: number) => {
    const response = await privateApi.get<ApiResponse<ShelfLifeGroupDto[]>>('/shelf-life-guides', {
      params: { categoryId },
    });
    return response.data.data;
  };

  /** Admin: every row of a category, turned-off ones included. */
  static adminList = async (categoryId: number) => {
    const response = await privateApi.get<ApiResponse<ShelfLifeGuideDto[]>>('/admin/shelf-life-guides', {
      params: { categoryId },
    });
    return response.data.data;
  };

  /** 409 `DUPLICATE_SHELF_LIFE_GUIDE` when the group already has that way of keeping. */
  static adminCreate = async (input: ShelfLifeGuideInput) => {
    const response = await privateApi.post<ApiResponse<ShelfLifeGuideDto>>('/admin/shelf-life-guides', input);
    return response.data.data;
  };

  static adminUpdate = async (id: number, input: ShelfLifeGuideInput) => {
    const response = await privateApi.put<ApiResponse<ShelfLifeGuideDto>>(`/admin/shelf-life-guides/${id}`, input);
    return response.data.data;
  };

  /** Soft delete: products that use it keep their numbers. */
  static adminDeactivate = async (id: number) => {
    await privateApi.delete<ApiResponse<null>>(`/admin/shelf-life-guides/${id}`);
  };
}

export default ShelfLifeApi;
