import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

/** One saved template row (contract §5). `dayOfWeek`: 0 = Sunday … 6 = Saturday; `defaultPrice` null = keep the price. */
export type StockTemplateItemDto = {
  productId: number;
  productName: string;
  unit: string;
  dayOfWeek: number;
  defaultQuantity: number;
  defaultPrice: number | null;
};

export type StockTemplateInput = {
  productId: number;
  dayOfWeek: number;
  defaultQuantity: number;
  defaultPrice?: number | null;
};

/** Result of "Apply to…": how many products were refilled, and the names that had no template for that weekday. */
export type ApplyTemplateResultDto = { productsUpdated: number; skipped: string[] };

/** FR-063 — the signed-in farmer's weekly stock templates (docs/api-contract.md §5). */
class StockTemplateApi {
  static list = async () => {
    const response = await privateApi.get<ApiResponse<StockTemplateItemDto[]>>('/farmer/stock-templates');
    return response.data.data;
  };

  /**
   * Replaces the whole set; an empty list clears it. 403 `FORBIDDEN` for another stall's product, 404
   * `PRODUCT_NOT_FOUND` for a deleted one, 400 `VALIDATION_ERROR` for the same product twice on one weekday.
   */
  static save = async (items: StockTemplateInput[]) => {
    const response = await privateApi.put<ApiResponse<StockTemplateItemDto[]>>('/farmer/stock-templates', { items });
    return response.data.data;
  };

  /** Sets stock (does not add to it) from the templates of `targetDate`'s weekday; `targetDate` is "yyyy-MM-dd". */
  static apply = async (targetDate: string) => {
    const response = await privateApi.post<ApiResponse<ApplyTemplateResultDto>>('/farmer/stock-templates/apply', {
      targetDate,
    });
    return response.data.data;
  };
}

export default StockTemplateApi;
