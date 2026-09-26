import type { ApiResponse, PageType } from '@/types/api.types';
import type { MarketType } from '@/types/market.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';
import type { ClosureHandling, ClosureType } from '@/data/admin';
import { dayName, formatDate } from '@/lib/format';

/** A market exactly as contract §3 returns it: camelCase, times "HH:mm", operating days 0…6 (0 = Sunday). */
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
  images: string[];
  operatingDays: number[];
  farmerCount: number;
};

/** A stall in `GET /markets/{id}` (contract §4). The stall module (cluster C2) is what fills data in here. */
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
  sortOrder: number;
  isActive: boolean;
  /** The standard shelf-life range — no official FR yet, see migration V20260926015. */
  minShelfLifeDays: number;
  maxShelfLifeDays: number;
};

/** Body of POST/PUT /admin/markets. If `city` is left empty the server fills in "TP. Hồ Chí Minh". */
export type MarketInput = {
  marketName: string;
  address: string;
  district?: string;
  city?: string;
  latitude: number;
  longitude: number;
  openingTime: string;
  closingTime: string;
  /** The URL returned by uploadMarketImage; the first image becomes the cover image on the server. */
  images: string[];
  operatingDays: number[];
};

/**
 * One closed day as the contract returns it (no official FR yet — see migration
 * V20260926014__create_market_closures_table.sql). `closedOn` is "yyyy-MM-dd", `createdAt` is ISO.
 */
export type MarketClosureDto = {
  id: number;
  marketId: number;
  closedOn: string;
  reason: string | null;
  handling: ClosureHandling;
  ordersAffected: number;
  announced: boolean;
  createdByName: string;
  createdAt: string;
};

export type MarketClosureInput = { closedOn: string; reason?: string; handling: ClosureHandling };

export type CategoryInput = {
  name: string;
  sortOrder: number;
  minShelfLifeDays: number;
  maxShelfLifeDays: number;
};

/**
 * The shape the Admin → Categories screen uses. `count` is the number of products — real from cluster C3, 0 before
 * that.
 */
export type CategoryType = {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  count: number;
  minShelfLifeDays: number;
  maxShelfLifeDays: number;
};

/**
 * Contract (camelCase) → the `MarketType` shape every page uses. The only place that knows both shapes; change the
 * contract here, not in the pages.
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
  images: dto.images,
});

/** "yyyy-MM-dd" (no timezone) → a local midnight Date, so weekday/format read the calendar date as typed. */
const parseIsoDate = (isoDate: string): Date => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const toClosure = (dto: MarketClosureDto): ClosureType => {
  const date = parseIsoDate(dto.closedOn);
  return {
    id: dto.id,
    marketId: dto.marketId,
    date: formatDate(date),
    weekday: dayName(date.getDay(), 'long'),
    reason: dto.reason ?? '',
    handling: dto.handling,
    orders: dto.ordersAffected,
    announced: dto.announced,
    by: `${dto.createdByName} · ${formatDate(new Date(dto.createdAt))}`,
  };
};

export const toCategory = (dto: CategoryDto): CategoryType => ({
  id: dto.id,
  name: dto.name,
  slug: dto.slug,
  sortOrder: dto.sortOrder,
  isActive: dto.isActive,
  count: 0,
  minShelfLifeDays: dto.minShelfLifeDays,
  maxShelfLifeDays: dto.maxShelfLifeDays,
});

export type MarketListParams = {
  q?: string;
  day?: number;
  city?: string;
  district?: string;
  page?: number;
  pageSize?: number;
};

/** FR-010, FR-012, FR-073, FR-076 — markets and categories (docs/api-contract.md §3, §5). */
class CatalogApi {
  /** Public. At most 50 markets per page; `page` counts from 1. */
  static listMarkets = async (params: MarketListParams = {}) => {
    const response = await publicApi.get<ApiResponse<PageType<MarketDto>>>('/markets', { params });
    const page = response.data.data;
    return { ...page, items: page.items.map(toMarket) };
  };

  /** Public. 404 `MARKET_NOT_FOUND` when the market does not exist or was removed. */
  static getMarket = async (id: number) => {
    const response = await publicApi.get<ApiResponse<{ market: MarketDto; farmers: StallSummaryDto[] }>>(
      `/markets/${id}`,
    );
    return { market: toMarket(response.data.data.market), farmers: response.data.data.farmers };
  };

  /** Upload a market image before sending the main form; returns a URL to put into `MarketInput.images`. */
  static uploadMarketImage = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await privateApi.post<ApiResponse<{ url: string }>>('/admin/markets/images', form, {
      // Drop the default application/json header so the browser sets multipart/form-data with the boundary itself.
      headers: { 'Content-Type': undefined },
    });
    return response.data.data.url;
  };

  static createMarket = async (input: MarketInput) => {
    const response = await privateApi.post<ApiResponse<MarketDto>>('/admin/markets', input);
    return toMarket(response.data.data);
  };

  static updateMarket = async (id: number, input: MarketInput) => {
    const response = await privateApi.put<ApiResponse<MarketDto>>(`/admin/markets/${id}`, input);
    return toMarket(response.data.data);
  };

  /** Soft delete: the market disappears from the customer pages, old orders can still point back to it. */
  static deactivateMarket = async (id: number) => {
    await privateApi.delete<ApiResponse<null>>(`/admin/markets/${id}`);
  };

  /** Raw DTOs, not `toClosure`-mapped: the admin form keeps `closedOn` around to sync edits back on submit. */
  static listClosures = async (marketId: number) => {
    const response = await privateApi.get<ApiResponse<MarketClosureDto[]>>(`/admin/markets/${marketId}/closures`);
    return response.data.data;
  };

  static createClosure = async (marketId: number, input: MarketClosureInput) => {
    const response = await privateApi.post<ApiResponse<MarketClosureDto>>(`/admin/markets/${marketId}/closures`, input);
    return toClosure(response.data.data);
  };

  static deleteClosure = async (marketId: number, closureId: number) => {
    await privateApi.delete<ApiResponse<null>>(`/admin/markets/${marketId}/closures/${closureId}`);
  };

  /** Public — only active categories, in exactly the order shown in the filter. */
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
