import type { DailyStockDto } from '@/api-requests/product.requests';
import type { StorageMode } from '@/api-requests/shelf-life.requests';
import type { ApiResponse, PageType } from '@/types/api.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';

export type DealDto = {
  productId: number;
  name: string;
  imageUrl?: string | null;
  unit: string;
  stallName: string;
  farmerId: number;
  marketNames: string[];
  stockDate: string;
  listPrice: number;
  unitPrice: number;
  discountPercent: number;
  bestBefore: string;
  daysLeft: number;
  quantityAvailable: number;
  storageMode: StorageMode;
};

export type DealListParams = {
  marketId?: number;
  categoryId?: number;
  day?: number;
  productId?: number;
  page?: number;
  pageSize?: number;
};

export type FarmerDealDto = {
  productId: number;
  productName: string;
  unit: string;
  stockDate: string;
  quantityAvailable: number;
  listPrice: number;
  unitPrice: number;
  discountPercent: number;
  packedOn: string;
  bestBefore: string;
  daysLeft: number;
};

export type { DailyStockDto };

export type DealInput = { quantityAvailable: number; packedOn: string; discountPercent: number };

class DealApi {
  static list = async (params: DealListParams = {}) => {
    const response = await publicApi.get<ApiResponse<PageType<DealDto>>>('/deals', { params });
    return response.data.data;
  };

  static mine = async () => {
    const response = await privateApi.get<ApiResponse<FarmerDealDto[]>>('/farmer/deals');
    return response.data.data;
  };

  static pickupDays = async (productId: number) => {
    const response = await privateApi.get<ApiResponse<DailyStockDto[]>>(`/farmer/products/${productId}/daily-stock`);
    return response.data.data;
  };

  static post = async (productId: number, date: string, input: DealInput) => {
    const response = await privateApi.put<ApiResponse<DailyStockDto>>(
      `/farmer/products/${productId}/daily-stock/${date}/deal`,
      input,
    );
    return response.data.data;
  };

  static remove = async (productId: number, date: string) => {
    await privateApi.delete<ApiResponse<null>>(`/farmer/products/${productId}/daily-stock/${date}/deal`);
  };
}

export default DealApi;
