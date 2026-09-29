import type { AddressParts } from '@/types/address.types';
import type { ApiResponse, PageType } from '@/types/api.types';
import type { ClosureHandling, ClosureType, MarketType } from '@/types/market.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';
import Session from '@/utils/session';
import { dayName, formatDate } from '@/lib/format';

export type MarketDto = {
  id: number;
  marketName: string;
  address: string;
  addressParts?: AddressParts | null;
  wardName?: string | null;
  provinceName?: string | null;
  latitude: number;
  longitude: number;
  mapProvider: string;
  openingTime: string;
  closingTime: string;
  images: string[];
  operatingDays: number[];
  farmerCount: number;
};

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
  minShelfLifeDays: number;
  maxShelfLifeDays: number;
  productCount: number;
};

export type MarketInput = {
  marketName: string;
  addressParts: AddressParts;
  latitude: number;
  longitude: number;
  openingTime: string;
  closingTime: string;
  images: string[];
  operatingDays: number[];
};

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

export const toMarket = (dto: MarketDto): MarketType => ({
  id: dto.id,
  name: dto.marketName,
  address: dto.address,
  area: dto.wardName ?? dto.provinceName ?? '',
  addressParts: dto.addressParts ?? undefined,
  days: dto.operatingDays,
  open: dto.openingTime.slice(0, 5),
  close: dto.closingTime.slice(0, 5),
  lat: Number(dto.latitude),
  lng: Number(dto.longitude),
  stalls: dto.farmerCount,
  images: dto.images,
});

export const parseIsoDate = (isoDate: string): Date => {
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

const toCategory = (dto: CategoryDto): CategoryType => ({
  id: dto.id,
  name: dto.name,
  slug: dto.slug,
  sortOrder: dto.sortOrder,
  isActive: dto.isActive,
  count: dto.productCount,
  minShelfLifeDays: dto.minShelfLifeDays,
  maxShelfLifeDays: dto.maxShelfLifeDays,
});

export type MarketListParams = {
  q?: string;
  day?: number;
  provinceCode?: string;
  wardCode?: string;
  page?: number;
  pageSize?: number;
};

const readApi = () => (Session.getRawUser() ? privateApi : publicApi);

class CatalogApi {
  static listMarkets = async (params: MarketListParams = {}) => {
    const response = await readApi().get<ApiResponse<PageType<MarketDto>>>('/markets', { params });
    const page = response.data.data;
    return { ...page, items: page.items.map(toMarket) };
  };

  static getMarket = async (id: number) => {
    const response = await readApi().get<ApiResponse<{ market: MarketDto; farmers: StallSummaryDto[] }>>(
      `/markets/${id}`,
    );
    return { market: toMarket(response.data.data.market), farmers: response.data.data.farmers };
  };

  static uploadMarketImage = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await privateApi.post<ApiResponse<{ url: string }>>('/admin/markets/images', form, {
      headers: { 'Content-Type': undefined },
      timeout: 0,
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

  static deactivateMarket = async (id: number) => {
    await privateApi.delete<ApiResponse<null>>(`/admin/markets/${id}`);
  };

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

  static listCategories = async () => {
    const response = await publicApi.get<ApiResponse<CategoryDto[]>>('/categories');
    return response.data.data.map(toCategory);
  };

  static listAllCategoriesAdmin = async () => {
    const response = await privateApi.get<ApiResponse<CategoryDto[]>>('/admin/categories');
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

  static deactivateCategory = async (id: number, moveToCategoryId?: number) => {
    await privateApi.delete<ApiResponse<null>>(`/admin/categories/${id}`, { params: { moveToCategoryId } });
  };

  static activateCategory = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<CategoryDto>>(`/admin/categories/${id}/activate`);
    return toCategory(response.data.data);
  };
}

export default CatalogApi;
