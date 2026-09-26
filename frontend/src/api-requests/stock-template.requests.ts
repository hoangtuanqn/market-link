import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

/** A recurring weekly stock template row (contract §5, FR-063). `defaultPrice` null = keep the product's current price. */
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

/** FR-063 — the current Farmer's own weekly stock template (docs/api-contract.md §5). */
class StockTemplateApi {
  static list = async () => {
    const response = await privateApi.get<ApiResponse<StockTemplateDto[]>>('/farmer/stock-templates');
    return response.data.data;
  };

  /** Overwrites the whole weekly schedule — always sends the full array, never a partial one. */
  static replace = async (items: StockTemplateItemInput[]) => {
    const response = await privateApi.put<ApiResponse<StockTemplateDto[]>>('/farmer/stock-templates', { items });
    return response.data.data;
  };
}

export default StockTemplateApi;
