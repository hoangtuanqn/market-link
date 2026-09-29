import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

export type StockTemplateDto = {
  productId: number;
  productName: string;
  dayOfWeek: number;
  defaultQuantity: number;
  defaultPrice: number | null;
};

export type StockTemplateItemInput = {
  productId: number;
  dayOfWeek: number;
  defaultQuantity: number;
  defaultPrice?: number | null;
};

class StockTemplateApi {
  static list = async () => {
    const response = await privateApi.get<ApiResponse<StockTemplateDto[]>>('/farmer/stock-templates');
    return response.data.data;
  };

  static replace = async (items: StockTemplateItemInput[]) => {
    const response = await privateApi.put<ApiResponse<StockTemplateDto[]>>('/farmer/stock-templates', { items });
    return response.data.data;
  };
}

export default StockTemplateApi;
