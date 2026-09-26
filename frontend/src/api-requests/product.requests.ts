import type { StallSummaryDto } from '@/api-requests/stall.requests';
import type { ApiResponse, PageType } from '@/types/api.types';
import type { ProductStatus, ProductType } from '@/types/product.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';

/** Một sản phẩm trong danh sách (contract §5). Giá trị `status` giữ snake_case như cột ENUM. */
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
};

export type ReviewSummaryDto = { ratingAvg: number; ratingCount: number; histogram: number[] };

/** GET /products/{id}: sản phẩm kèm stall và tóm tắt đánh giá (số thật từ C8). */
export type ProductDetailDto = {
  product: ProductDto;
  description?: string | null;
  farmer: StallSummaryDto;
  reviewsSummary: ReviewSummaryDto;
};

/** Sản phẩm nhìn từ Farmer sở hữu: thêm mô tả và cờ ẩn của admin kèm lý do (FR-074). */
export type FarmerProductDto = {
  item: ProductDto;
  description?: string | null;
  hidden: boolean;
  hiddenReason?: string | null;
};

export type ProductInput = {
  categoryId: number;
  name: string;
  description?: string;
  price: number;
  unit: string;
  stockQuantity: number;
  imageUrl?: string;
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

/** Contract (camelCase) → hình dạng `ProductType` mà mọi trang đang dùng. Chỗ duy nhất biết cả hai. */
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
});

export const toFarmerProduct = (dto: FarmerProductDto): ProductType => ({
  ...toProduct(dto.item, dto.description),
  hidden: dto.hidden,
  hiddenReason: dto.hiddenReason ?? undefined,
});

/** FR-020…023, FR-062, FR-064, FR-074 — sản phẩm (docs/api-contract.md §5, §10). */
class ProductApi {
  /** Public. `page` từ 1, tối đa 50 một trang; `sort` qua whitelist ở server. */
  static list = async (params: ProductListParams = {}) => {
    const response = await publicApi.get<ApiResponse<PageType<ProductDto>>>('/products', { params });
    const page = response.data.data;
    return { ...page, items: page.items.map((p) => toProduct(p)) };
  };

  /** Public. 404 `PRODUCT_NOT_FOUND` khi không có, đã gỡ, bị ẩn hoặc stall chưa duyệt. */
  static get = async (id: number) => {
    const response = await publicApi.get<ApiResponse<ProductDetailDto>>(`/products/${id}`);
    return response.data.data;
  };

  /** Public. Tồn kho tuần hiện tại của một stall (FR-011). */
  static byFarmer = async (farmerId: number, day?: number) => {
    const response = await publicApi.get<ApiResponse<PageType<ProductDto>>>(`/farmers/${farmerId}/products`, {
      params: { pageSize: 50, ...(day == null ? {} : { day }) },
    });
    return response.data.data.items.map((p) => toProduct(p));
  };

  /** Farmer — sản phẩm của chính mình, kể cả sản phẩm bị admin ẩn (kèm lý do). */
  static mine = async (status?: ProductStatus) => {
    const response = await privateApi.get<ApiResponse<PageType<FarmerProductDto>>>('/farmer/products', {
      params: { pageSize: 50, ...(status ? { status } : {}) },
    });
    return response.data.data.items.map(toFarmerProduct);
  };

  static create = async (input: ProductInput) => {
    const response = await privateApi.post<ApiResponse<FarmerProductDto>>('/farmer/products', input);
    return toFarmerProduct(response.data.data);
  };

  static update = async (id: number, input: ProductInput) => {
    const response = await privateApi.put<ApiResponse<FarmerProductDto>>(`/farmer/products/${id}`, input);
    return toFarmerProduct(response.data.data);
  };

  /** Xoá mềm: biến mất khỏi danh mục, đơn cũ vẫn giữ dòng của nó. */
  static remove = async (id: number) => {
    await privateApi.delete<ApiResponse<null>>(`/farmer/products/${id}`);
  };

  /** FR-064: sold_out / unavailable không đụng tồn kho. */
  static setStatus = async (id: number, status: ProductStatus) => {
    const response = await privateApi.patch<ApiResponse<FarmerProductDto>>(`/farmer/products/${id}/status`, {
      status,
    });
    return toFarmerProduct(response.data.data);
  };

  /** Admin — FR-074. Lý do hiện cho Farmer trong danh sách của họ. */
  static adminHide = async (id: number, reason: string) => {
    await privateApi.patch<ApiResponse<null>>(`/admin/products/${id}/hide`, { reason });
  };

  static adminUnhide = async (id: number) => {
    await privateApi.patch<ApiResponse<null>>(`/admin/products/${id}/unhide`);
  };
}

export default ProductApi;
