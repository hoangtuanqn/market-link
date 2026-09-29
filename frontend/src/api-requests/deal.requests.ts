import type { DailyStockDto } from '@/api-requests/product.requests';
import type { StorageMode } from '@/api-requests/shelf-life.requests';
import type { ApiResponse, PageType } from '@/types/api.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';

/**
 * One product on a near-expiry deal for one pickup day (GET /deals, FR-125). Dates "yyyy-MM-dd"; `daysLeft` counts the
 * pickup day itself; `marketNames` are the markets the stall is at on that day.
 */
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

/** `day` is the pickup weekday, 0 = Sunday … 6 = Saturday, like GET /products. */
export type DealListParams = {
  marketId?: number;
  categoryId?: number;
  day?: number;
  productId?: number;
  page?: number;
  pageSize?: number;
};

/** One deal day of the Farmer's own stall (GET /farmer/deals, FR-124). */
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

/** The one product_daily_stock row shape (PATCH, GET daily-stock, PUT deal) — declared once in product.requests.ts. */
export type { DailyStockDto };

export type DealInput = { quantityAvailable: number; packedOn: string; discountPercent: number };

/** FR-124, FR-125 — near-expiry deals (docs/api-contract.md §5). */
class DealApi {
  /** Public. Deal days customers can still order for, nearest day first, then the biggest discount. */
  static list = async (params: DealListParams = {}) => {
    const response = await publicApi.get<ApiResponse<PageType<DealDto>>>('/deals', { params });
    return response.data.data;
  };

  /** Farmer — the stall's deal days from today on. */
  static mine = async () => {
    const response = await privateApi.get<ApiResponse<FarmerDealDto[]>>('/farmer/deals');
    return response.data.data;
  };

  /** Farmer — the days of the next 14 a customer can still order this product for, each with its numbers. */
  static pickupDays = async (productId: number) => {
    const response = await privateApi.get<ApiResponse<DailyStockDto[]>>(`/farmer/products/${productId}/daily-stock`);
    return response.data.data;
  };

  /**
   * Farmer — puts one pickup day on a deal. 400 `NOT_NEAR_EXPIRY` / `EXPIRED_BEFORE_PICKUP` / `VALIDATION_ERROR`
   * (`discountPercent`, `packedOn`, `quantityAvailable`); 409 `DATE_NOT_ORDERABLE`.
   */
  static post = async (productId: number, date: string, input: DealInput) => {
    const response = await privateApi.put<ApiResponse<DailyStockDto>>(
      `/farmer/products/${productId}/daily-stock/${date}/deal`,
      input,
    );
    return response.data.data;
  };

  /** Farmer — back to the normal price; the quantity stays. */
  static remove = async (productId: number, date: string) => {
    await privateApi.delete<ApiResponse<null>>(`/farmer/products/${productId}/daily-stock/${date}/deal`);
  };
}

export default DealApi;
