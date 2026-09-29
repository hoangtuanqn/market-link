import type { ShelfLifeDto, StorageMode } from '@/api-requests/shelf-life.requests';
import type { StallSummaryDto } from '@/api-requests/stall.requests';
import type { ApiResponse, PageType } from '@/types/api.types';
import type { ProductStatus, ProductType } from '@/types/product.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';
import Session from '@/utils/session';

export type ProductDto = {
  id: number;
  name: string;
  farmerId: number;
  stallName: string;
  marketId?: number | null;
  marketName?: string | null;
  categoryId: number;
  categoryName: string;
  price: number;
  unit: string;
  stockQuantity: number;
  imageUrl?: string | null;
  status: ProductStatus;
  ratingAvg: number;
  ratingCount: number;
  shelfLifeDays: number;
  availableDate?: string | null;
};

export type ReviewSummaryDto = { ratingAvg: number; ratingCount: number; histogram: number[] };

export type DailyStockDto = {
  productId: number;
  stockDate: string;
  quantityAvailable: number;
  unitPrice: number;
  listPrice: number | null;
  discountPercent: number | null;
  packedOn: string | null;
  bestBefore: string | null;
};

export type ProductDetailDto = {
  product: ProductDto;
  description?: string | null;
  farmer: StallSummaryDto;
  reviewsSummary: ReviewSummaryDto;
  shelfLife?: ShelfLifeDto | null;
};

export type FarmerProductDto = {
  item: ProductDto;
  description?: string | null;
  hidden: boolean;
  hiddenReason?: string | null;
  nextDate?: string | null;
  nextDateAvailable?: number | null;
  nextDateReserved?: number | null;
  shelfLife?: ShelfLifeDto | null;
};

export type ProductInput = {
  categoryId: number;
  name: string;
  description?: string;
  price: number;
  unit: string;
  stockQuantity: number;
  imageUrl?: string;
  shelfLifeDays: number;
  shelfLifeGuideId?: number;
  storageMode?: StorageMode;
  acknowledgeLongerShelfLife?: boolean;
};

export type ProductListParams = {
  q?: string;
  categoryId?: number;
  marketId?: number;
  farmerId?: number;
  day?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating';
  page?: number;
  pageSize?: number;
};

export const toProduct = (dto: ProductDto, description?: string | null): ProductType => ({
  id: dto.id,
  name: dto.name,
  stall: dto.stallName,
  marketName: dto.marketName ?? '',
  category: dto.categoryName,
  categoryId: dto.categoryId,
  price: Number(dto.price),
  unit: dto.unit,
  stock: dto.stockQuantity,
  status: dto.status,
  farmerId: dto.farmerId,
  desc: description ?? undefined,
  imageUrl: dto.imageUrl ?? undefined,
  shelfLifeDays: dto.shelfLifeDays,
  availableDate: dto.availableDate ?? undefined,
});

const toFarmerProduct = (dto: FarmerProductDto): ProductType => ({
  ...toProduct(dto.item, dto.description),
  hidden: dto.hidden,
  hiddenReason: dto.hiddenReason ?? undefined,
  nextDate: dto.nextDate ?? undefined,
  nextLeft: dto.nextDateAvailable ?? undefined,
  nextReserved: dto.nextDateReserved ?? undefined,
  shelfLife: dto.shelfLife ?? undefined,
});

const readApi = () => (Session.getRawUser() ? privateApi : publicApi);

class ProductApi {
  static list = async (params: ProductListParams = {}) => {
    const response = await readApi().get<ApiResponse<PageType<ProductDto>>>('/products', { params });
    const page = response.data.data;
    return { ...page, items: page.items.map((p) => toProduct(p)) };
  };

  static get = async (id: number) => {
    const response = await readApi().get<ApiResponse<ProductDetailDto>>(`/products/${id}`);
    return response.data.data;
  };

  static byFarmer = async (farmerId: number, day?: number) => {
    const response = await publicApi.get<ApiResponse<PageType<ProductDto>>>(`/farmers/${farmerId}/products`, {
      params: { pageSize: 50, ...(day == null ? {} : { day }) },
    });
    return response.data.data.items.map((p) => toProduct(p));
  };

  static mine = async (status?: ProductStatus) => {
    const response = await privateApi.get<ApiResponse<PageType<FarmerProductDto>>>('/farmer/products', {
      params: { pageSize: 50, ...(status ? { status } : {}) },
    });
    return response.data.data.items.map(toFarmerProduct);
  };

  static getMine = async (id: number) => {
    const response = await privateApi.get<ApiResponse<FarmerProductDto>>(`/farmer/products/${id}`);
    return toFarmerProduct(response.data.data);
  };

  static uploadProductImage = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await privateApi.post<ApiResponse<{ url: string }>>('/farmer/products/images', form, {
      headers: { 'Content-Type': undefined },
      timeout: 0,
    });
    return response.data.data.url;
  };

  static create = async (input: ProductInput) => {
    const response = await privateApi.post<ApiResponse<FarmerProductDto>>('/farmer/products', input);
    return toFarmerProduct(response.data.data);
  };

  static update = async (id: number, input: ProductInput) => {
    const response = await privateApi.put<ApiResponse<FarmerProductDto>>(`/farmer/products/${id}`, input);
    return toFarmerProduct(response.data.data);
  };

  static remove = async (id: number) => {
    await privateApi.delete<ApiResponse<null>>(`/farmer/products/${id}`);
  };

  static mineDeleted = async () => {
    const response = await privateApi.get<ApiResponse<PageType<FarmerProductDto>>>('/farmer/products/deleted', {
      params: { pageSize: 50 },
    });
    return response.data.data.items.map(toFarmerProduct);
  };

  static restore = async (id: number) => {
    const response = await privateApi.post<ApiResponse<FarmerProductDto>>(`/farmer/products/${id}/restore`);
    return toFarmerProduct(response.data.data);
  };

  static setStatus = async (id: number, status: ProductStatus) => {
    const response = await privateApi.patch<ApiResponse<FarmerProductDto>>(`/farmer/products/${id}/status`, {
      status,
    });
    return toFarmerProduct(response.data.data);
  };

  static overrideDailyStock = async (id: number, date: string, quantityAvailable: number, unitPrice: number | null) => {
    const response = await privateApi.patch<ApiResponse<DailyStockDto>>(`/farmer/products/${id}/daily-stock/${date}`, {
      quantityAvailable,
      unitPrice,
    });
    return response.data.data;
  };

  static adminHide = async (id: number, reason: string) => {
    await privateApi.patch<ApiResponse<null>>(`/admin/products/${id}/hide`, { reason });
  };

  static adminHidden = async () => {
    const response = await privateApi.get<ApiResponse<PageType<FarmerProductDto>>>('/admin/products/hidden', {
      params: { pageSize: 50 },
    });
    return response.data.data.items.map(toFarmerProduct);
  };

  static adminUnhide = async (id: number) => {
    await privateApi.patch<ApiResponse<null>>(`/admin/products/${id}/unhide`);
  };
}

export default ProductApi;
