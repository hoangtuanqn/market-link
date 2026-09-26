import type { ApiResponse } from '@/types/api.types';
import type { ProductStatus } from '@/types/product.types';
import { privateApi } from '@/utils/axiosInstance';

/** Một dòng lịch tồn kho tuần (contract §5, FR-063). `defaultPrice` null = giữ giá hiện tại khi apply. */
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

/** Một product vừa được nạp lại tồn kho bởi POST .../apply. */
export type StockTemplateApplyResultDto = {
  productId: number;
  productName: string;
  stockQuantity: number;
  price: number;
  status: ProductStatus;
};

/** FR-063 — lịch tồn kho tuần của chính Farmer (docs/api-contract.md §5). */
class StockTemplateApi {
  static list = async () => {
    const response = await privateApi.get<ApiResponse<StockTemplateDto[]>>('/farmer/stock-templates');
    return response.data.data;
  };

  /** Ghi đè trọn bộ lịch tuần — gửi cả mảng, không phải một phần. */
  static replace = async (items: StockTemplateItemInput[]) => {
    const response = await privateApi.put<ApiResponse<StockTemplateDto[]>>('/farmer/stock-templates', { items });
    return response.data.data;
  };

  /** `targetDate` dạng "yyyy-MM-dd" — khớp thẳng giá trị của `<input type="date">`. */
  static apply = async (targetDate: string) => {
    const response = await privateApi.post<ApiResponse<StockTemplateApplyResultDto[]>>(
      '/farmer/stock-templates/apply',
      { targetDate },
    );
    return response.data.data;
  };
}

export default StockTemplateApi;
