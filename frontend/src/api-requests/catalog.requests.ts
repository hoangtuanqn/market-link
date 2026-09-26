import type { ApiResponse, PageType } from '@/types/api.types';
import type { MarketType } from '@/types/market.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';

/** Một chợ đúng như contract §3 trả về: camelCase, giờ "HH:mm", ngày họp 0…6 (0 = Chủ nhật). */
export type MarketDto = {
  id: number;
  marketName: string;
  address: string;
  district?: string | null;
  city: string;
  latitude: number;
  longitude: number;
  mapProvider: string;
  openingTime: string;
  closingTime: string;
  imageUrl?: string | null;
  operatingDays: number[];
  farmerCount: number;
};

/** Một stall trong `GET /markets/{id}` (contract §4). Module stall (cụm C2) mới đổ dữ liệu vào đây. */
export type StallSummaryDto = {
  farmerId: number;
  stallName: string;
  logoUrl?: string | null;
  stallCode?: string | null;
  stallLatitude?: number | null;
  stallLongitude?: number | null;
  ratingAvg: number;
  ratingCount: number;
  operatingDays: number[];
};

export type CategoryDto = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
};

/** Body của POST/PUT /admin/markets. `city` bỏ trống thì server điền "TP. Hồ Chí Minh". */
export type MarketInput = {
  marketName: string;
  address: string;
  district?: string;
  city?: string;
  latitude: number;
  longitude: number;
  openingTime: string;
  closingTime: string;
  imageUrl?: string;
  operatingDays: number[];
};

export type CategoryInput = { name: string; description?: string; icon?: string; sortOrder: number };

/** Hình dạng mà màn Admin → Categories đang dùng. `count` là số sản phẩm — có thật từ cụm C3, trước đó là 0. */
export type CategoryType = {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  count: number;
};

/**
 * Contract (camelCase) → hình dạng `MarketType` mà mọi trang đang dùng. Đây là chỗ duy nhất biết cả hai hình dạng; đổi
 * contract thì sửa ở đây, không sửa trang.
 */
export const toMarket = (dto: MarketDto): MarketType => ({
  id: dto.id,
  name: dto.marketName,
  address: dto.address,
  district: dto.district ?? '',
  days: dto.operatingDays,
  open: dto.openingTime.slice(0, 5),
  close: dto.closingTime.slice(0, 5),
  lat: Number(dto.latitude),
  lng: Number(dto.longitude),
  stalls: dto.farmerCount,
});

export const toCategory = (dto: CategoryDto): CategoryType => ({
  id: dto.id,
  name: dto.name,
  slug: dto.slug,
  sortOrder: dto.sortOrder,
  isActive: dto.isActive,
  count: 0,
});

export type MarketListParams = {
  q?: string;
  day?: number;
  city?: string;
  district?: string;
  page?: number;
  pageSize?: number;
};

/** FR-010, FR-012, FR-073, FR-076 — chợ và danh mục (docs/api-contract.md §3, §5). */
class CatalogApi {
  /** Public. Một trang tối đa 50 chợ; `page` đếm từ 1. */
  static listMarkets = async (params: MarketListParams = {}) => {
    const response = await publicApi.get<ApiResponse<PageType<MarketDto>>>('/markets', { params });
    const page = response.data.data;
    return { ...page, items: page.items.map(toMarket) };
  };

  /** Public. 404 `MARKET_NOT_FOUND` khi chợ không có hoặc đã bị gỡ. */
  static getMarket = async (id: number) => {
    const response = await publicApi.get<ApiResponse<{ market: MarketDto; farmers: StallSummaryDto[] }>>(
      `/markets/${id}`,
    );
    return { market: toMarket(response.data.data.market), farmers: response.data.data.farmers };
  };

  static createMarket = async (input: MarketInput) => {
    const response = await privateApi.post<ApiResponse<MarketDto>>('/admin/markets', input);
    return toMarket(response.data.data);
  };

  static updateMarket = async (id: number, input: MarketInput) => {
    const response = await privateApi.put<ApiResponse<MarketDto>>(`/admin/markets/${id}`, input);
    return toMarket(response.data.data);
  };

  /** Xoá mềm: chợ biến mất khỏi trang khách, đơn cũ vẫn trỏ về được. */
  static deactivateMarket = async (id: number) => {
    await privateApi.delete<ApiResponse<null>>(`/admin/markets/${id}`);
  };

  /** Public — chỉ danh mục đang bật, đúng thứ tự hiện trong bộ lọc. */
  static listCategories = async () => {
    const response = await publicApi.get<ApiResponse<CategoryDto[]>>('/categories');
    return response.data.data.map(toCategory);
  };

  static createCategory = async (input: CategoryInput) => {
    const response = await privateApi.post<ApiResponse<CategoryDto>>('/admin/categories', input);
    return toCategory(response.data.data);
  };

  static updateCategory = async (id: number, input: CategoryInput) => {
    const response = await privateApi.put<ApiResponse<CategoryDto>>(`/admin/categories/${id}`, input);
    return toCategory(response.data.data);
  };

  static deactivateCategory = async (id: number) => {
    await privateApi.delete<ApiResponse<null>>(`/admin/categories/${id}`);
  };
}

export default CatalogApi;
