import type { ShelfLifeDto, StorageMode } from '@/api-requests/shelf-life.requests';
import type { StallSummaryDto } from '@/api-requests/stall.requests';
import type { ApiResponse, PageType } from '@/types/api.types';
import type { ProductStatus, ProductType } from '@/types/product.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';

/** One product in the list (contract §5). The `status` value keeps snake_case like the ENUM column. */
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
  /** Days still fresh — no official FR yet, see migration V20260926016. */
  shelfLifeDays: number;
  /** The pickup date ("yyyy-MM-dd") `stockQuantity`/`price` are for on public pages; null when none applies. */
  availableDate?: string | null;
};

export type ReviewSummaryDto = { ratingAvg: number; ratingCount: number; histogram: number[] };

/**
 * One product_daily_stock row: the response of PATCH /farmer/products/{id}/daily-stock/{date} (FR-063), GET
 * /farmer/products/{id}/daily-stock and PUT .../daily-stock/{date}/deal (FR-124). The four deal fields are null when
 * that day carries no deal.
 */
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

/** GET /products/{id}: a product with its stall and review summary (real numbers from C8). */
export type ProductDetailDto = {
  product: ProductDto;
  description?: string | null;
  farmer: StallSummaryDto;
  reviewsSummary: ReviewSummaryDto;
  /** FR-121: how it is kept and the stall's promise. */
  shelfLife?: ShelfLifeDto | null;
};

/** A product as seen by the owning Farmer: adds the description and the admin's hide flag with its reason (FR-074). */
export type FarmerProductDto = {
  item: ProductDto;
  description?: string | null;
  hidden: boolean;
  hiddenReason?: string | null;
  /** `GET /farmer/products` only: the nearest date a customer can still order for, null when none in 14 days. */
  nextDate?: string | null;
  /** Units left for `nextDate`; null when there is no date. */
  nextDateAvailable?: number | null;
  /** Units placed / accepted / ready orders hold for `nextDate`. */
  nextDateReserved?: number | null;
  /** One-product endpoints only: the stored shelf-life block for the edit form. */
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
  /** The chosen storage group (required once the category has groups). */
  shelfLifeGuideId?: number;
  storageMode?: StorageMode;
  /** Must be true when shelfLifeDays is longer than the suggestion (FR-121). */
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

/** Contract (camelCase) → the `ProductType` shape every page uses. The only place that knows both. */
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

/** FR-020…023, FR-062, FR-064, FR-074 — products (docs/api-contract.md §5, §10). */
class ProductApi {
  /** Public. `page` from 1, at most 50 per page; `sort` goes through a whitelist on the server. */
  static list = async (params: ProductListParams = {}) => {
    const response = await publicApi.get<ApiResponse<PageType<ProductDto>>>('/products', { params });
    const page = response.data.data;
    return { ...page, items: page.items.map((p) => toProduct(p)) };
  };

  /** Public. 404 `PRODUCT_NOT_FOUND` when missing, removed, hidden or the stall is not approved. */
  static get = async (id: number) => {
    const response = await publicApi.get<ApiResponse<ProductDetailDto>>(`/products/${id}`);
    return response.data.data;
  };

  /** Public. This week's stock of a stall (FR-011). */
  static byFarmer = async (farmerId: number, day?: number) => {
    const response = await publicApi.get<ApiResponse<PageType<ProductDto>>>(`/farmers/${farmerId}/products`, {
      params: { pageSize: 50, ...(day == null ? {} : { day }) },
    });
    return response.data.data.items.map((p) => toProduct(p));
  };

  /** Farmer — your own products, including products hidden by an admin (with the reason). */
  static mine = async (status?: ProductStatus) => {
    const response = await privateApi.get<ApiResponse<PageType<FarmerProductDto>>>('/farmer/products', {
      params: { pageSize: 50, ...(status ? { status } : {}) },
    });
    return response.data.data.items.map(toFarmerProduct);
  };

  /** Farmer — one of their own products, to open the edit form. 404 if missing or belonging to another stall. */
  static getMine = async (id: number) => {
    const response = await privateApi.get<ApiResponse<FarmerProductDto>>(`/farmer/products/${id}`);
    return toFarmerProduct(response.data.data);
  };

  /** Upload a product image before sending the main form; returns a URL to put into `ProductInput.imageUrl`. */
  static uploadProductImage = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await privateApi.post<ApiResponse<{ url: string }>>('/farmer/products/images', form, {
      // Drop the default application/json header so the browser sets multipart/form-data with the boundary itself.
      headers: { 'Content-Type': undefined },
      // No timeout: the instance's 10 s would cut off a large photo on a phone connection.
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

  /** Soft delete: disappears from the catalog, old orders keep their own row. */
  static remove = async (id: number) => {
    await privateApi.delete<ApiResponse<null>>(`/farmer/products/${id}`);
  };

  /** Farmer — soft-deleted products in trash. */
  static mineDeleted = async () => {
    const response = await privateApi.get<ApiResponse<PageType<FarmerProductDto>>>('/farmer/products/deleted', {
      params: { pageSize: 50 },
    });
    return response.data.data.items.map(toFarmerProduct);
  };

  /** Farmer — restore a soft-deleted product back to unavailable status. */
  static restore = async (id: number) => {
    const response = await privateApi.post<ApiResponse<FarmerProductDto>>(`/farmer/products/${id}/restore`);
    return toFarmerProduct(response.data.data);
  };

  /** FR-064: sold_out / unavailable does not touch stock. */
  static setStatus = async (id: number, status: ProductStatus) => {
    const response = await privateApi.patch<ApiResponse<FarmerProductDto>>(`/farmer/products/${id}/status`, {
      status,
    });
    return toFarmerProduct(response.data.data);
  };

  /**
   * FR-063 — adjusts one pickup date without touching the recurring weekly template. `unitPrice` null keeps that date's
   * existing price. 400 if no template covers that weekday yet.
   */
  static overrideDailyStock = async (id: number, date: string, quantityAvailable: number, unitPrice: number | null) => {
    const response = await privateApi.patch<ApiResponse<DailyStockDto>>(`/farmer/products/${id}/daily-stock/${date}`, {
      quantityAvailable,
      unitPrice,
    });
    return response.data.data;
  };

  /** Admin — FR-074. The reason is shown to the Farmer in their list. */
  static adminHide = async (id: number, reason: string) => {
    await privateApi.patch<ApiResponse<null>>(`/admin/products/${id}/hide`, { reason });
  };

  /** Admin — FR-074. Hidden listings, newest change first, so each one can be found again and unhidden. */
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
