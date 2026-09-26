import type { ApiResponse, PageType } from '@/types/api.types';
import type { OrderHistoryEntry, OrderStatus, OrderType } from '@/types/order.types';
import type { ProductStatus } from '@/types/product.types';
import { privateApi } from '@/utils/axiosInstance';

/** Một dòng giỏ hàng gửi lên server: preview, place hoặc sửa đơn (contract §7). */
export type CartLineInput = { productId: number; quantity: number };

/** Một đơn trong lệnh đặt: một stall, một chợ, một slot (D-01). */
export type OrderGroupInput = {
  farmerId: number;
  marketId: number;
  slotId?: number | null;
  /** "yyyy-MM-dd". */
  pickupDate: string;
  items: CartLineInput[];
  customerNote?: string;
};

/**
 * Một dòng của group xem trước. `status` là trạng thái bán được thật: sản phẩm bị ẩn hoặc đã xoá hiện `unavailable` dù
 * cột status còn `available` (C5-12).
 */
export type PreviewItemDto = {
  productId: number;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  stockQuantity: number;
  status: ProductStatus;
};

/**
 * Một đơn sẽ được tách ra khi đặt (D-01). `problems` gom vấn đề của group (`out_of_stock`, `sold_out`, `unavailable`,
 * `stall_suspended`) thay vì ném lỗi. `markets` là các chợ stall đang bán; `marketId` / `marketName` chỉ có khi stall
 * bán đúng một chợ (C5-11).
 */
export type OrderGroupPreviewDto = {
  farmerId: number;
  stallName: string;
  marketId: number | null;
  marketName: string | null;
  orderCutoffHours: number;
  items: PreviewItemDto[];
  subtotal: number;
  problems: string[];
  markets: { marketId: number; marketName: string }[];
};

/** Một đơn vừa tạo. `cutoffAt` là ISO 8601 UTC ("2026-09-28T12:00:00Z"). */
export type PlacedOrderDto = {
  orderId: number;
  orderCode: string;
  status: OrderStatus;
  cutoffAt: string;
  totalAmount: number;
};

/**
 * Một dòng trong danh sách đơn — của khách (`GET /orders`) hoặc của Farmer (`GET /farmer/orders`). Ngày "yyyy-MM-dd",
 * giờ "HH:mm"; `cutoffAt`/`createdAt` là ISO 8601 UTC (C5-15).
 */
export type OrderListItemDto = {
  orderId: number;
  orderCode: string;
  status: OrderStatus;
  farmerId: number;
  stallName: string;
  marketId: number | null;
  marketName: string | null;
  pickupDate: string;
  pickupStart: string;
  pickupEnd: string;
  cutoffAt: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
};

/** Một dòng của `order_items` — tên/giá/đơn vị đã chép lúc đặt (contract §7). */
export type OrderItemDto = {
  productId: number;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

/**
 * Một dòng `order_status_history` (FR-038). `fromStatus` là `null` ở dòng đầu tiên (lúc đặt). `changedByRole` là
 * `customer|farmer|admin`, `null` khi hệ thống tự đổi.
 */
export type OrderHistoryDto = {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedAt: string;
  note: string | null;
  changedByName: string | null;
  changedByRole: 'customer' | 'farmer' | 'admin' | null;
};

/** Liên hệ của khách — chỉ Farmer của đơn thấy được (FR-036). */
export type CustomerSummaryDto = { userId: number; fullName: string; phone: string; email: string };

/**
 * `GET /orders/{id}` (contract §7, FR-033/036/065). `customer` vắng khỏi JSON hoàn toàn khi người gọi không phải Farmer
 * của chính đơn này (C5-16) — optional field, không phải `null`.
 */
export type OrderDetailDto = {
  summary: OrderListItemDto;
  items: OrderItemDto[];
  statusHistory: OrderHistoryDto[];
  canCancel: boolean;
  canModify: boolean;
  customerNote: string | null;
  farmerNote: string | null;
  customer?: CustomerSummaryDto;
};

/** Contract (camelCase) → hình dạng `OrderType` mà các trang đang dùng. Chỗ duy nhất biết cả hai. */
export const toOrder = (dto: OrderDetailDto): OrderType => ({
  code: dto.summary.orderCode,
  farmerId: dto.summary.farmerId,
  marketId: dto.summary.marketId ?? 0,
  date: dto.summary.pickupDate,
  slot: `${dto.summary.pickupStart}–${dto.summary.pickupEnd}`,
  status: dto.summary.status,
  cutoff: dto.summary.cutoffAt,
  locked: (dto.summary.status === 'placed' || dto.summary.status === 'accepted') && !dto.canCancel,
  items: dto.items.map((i) => ({ productId: i.productId, qty: i.quantity })),
  reason: dto.summary.status === 'declined' ? (dto.farmerNote ?? undefined) : undefined,
  history: dto.statusHistory.map((h): OrderHistoryEntry => [h.toStatus, h.changedAt, h.changedByName ?? '']),
});

/**
 * FR-030…039, 065…067 — giỏ hàng, đơn của khách và của Farmer (docs/api-contract.md §7). Mọi hàm cần đăng nhập
 * (`privateApi`): mua hàng mở cho `CUSTOMER` và `FARMER` (D-13), admin bị chặn ở server → 403.
 */
class OrderApi {
  /**
   * Giỏ sẽ được tách thành những đơn nào; vấn đề từng đơn nằm trong `problems`, không ném lỗi. 400 `VALIDATION_ERROR`
   * khi `productId` không tồn tại.
   */
  static preview = async (items: CartLineInput[]) => {
    const response = await privateApi.post<ApiResponse<{ groups: OrderGroupPreviewDto[] }>>('/orders/preview', {
      items,
    });
    return response.data.data.groups;
  };

  /**
   * Đặt cả giỏ: mỗi group một đơn, cả lệnh trong một transaction (D-01, D-02). 409 `OUT_OF_STOCK` / `SLOT_FULL` /
   * `SLOT_UNAVAILABLE` / `CUTOFF_PASSED` / `STALL_UNAVAILABLE`.
   */
  static place = async (groups: OrderGroupInput[]) => {
    const response = await privateApi.post<ApiResponse<{ orders: PlacedOrderDto[] }>>('/orders', { groups });
    return response.data.data.orders;
  };

  /** Đơn của chính người gọi với vai buyer (D-13: Farmer cũng mua hàng), mới nhất trước. `page` từ 1. */
  static list = async (params: { status?: OrderStatus; page?: number; pageSize?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<PageType<OrderListItemDto>>>('/orders', { params });
    return response.data.data;
  };

  /** Buyer của đơn hoặc Farmer sở hữu đơn mới đọc được (R-06); còn lại 403, kể cả khi id có thật. */
  static get = async (id: number) => {
    const response = await privateApi.get<ApiResponse<OrderDetailDto>>(`/orders/${id}`);
    return response.data.data;
  };

  /**
   * FR-034 — chỉ khách mua huỷ được đơn của chính mình, trước cutoff. Sai chủ → 403; sai trạng thái → 409
   * `INVALID_TRANSITION`; quá cutoff → 409 `CUTOFF_PASSED`.
   */
  static cancel = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/orders/${id}/cancel`);
    return response.data.data;
  };

  /**
   * FR-035 — sửa số lượng hoặc bỏ item trước cutoff, không bao giờ thêm sản phẩm mới (D-07). 400 `PRODUCT_NOT_IN_ORDER`
   * khi thêm sản phẩm mới; 409 `OUT_OF_STOCK` khi tăng số lượng sản phẩm không còn bán; 409 `CUTOFF_PASSED`.
   */
  static modifyItems = async (id: number, items: CartLineInput[]) => {
    const response = await privateApi.put<ApiResponse<OrderDetailDto>>(`/orders/${id}/items`, { items });
    return response.data.data;
  };

  /** Farmer — đơn đặt tại sạp của chính mình, lọc theo trạng thái và ngày nhận hàng (`pickup_date`). */
  static farmerList = async (
    params: { status?: OrderStatus; date?: string; page?: number; pageSize?: number } = {},
  ) => {
    const response = await privateApi.get<ApiResponse<PageType<OrderListItemDto>>>('/farmer/orders', { params });
    return response.data.data;
  };

  /** `placed → accepted`. Sai chủ → 403; sai trạng thái → 409 `INVALID_TRANSITION`. */
  static accept = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/farmer/orders/${id}/accept`);
    return response.data.data;
  };

  /** `placed → declined`, hoàn tồn kho. `reason` bắt buộc, tối đa 255 ký tự (400 `VALIDATION_ERROR`). */
  static decline = async (id: number, reason: string) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/farmer/orders/${id}/decline`, { reason });
    return response.data.data;
  };

  /** `accepted → ready`. Sai trạng thái → 409 `INVALID_TRANSITION`. */
  static markReady = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/farmer/orders/${id}/ready`);
    return response.data.data;
  };

  /** `ready → completed` (D-03). Sai trạng thái → 409 `INVALID_TRANSITION`. */
  static complete = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/farmer/orders/${id}/complete`);
    return response.data.data;
  };
}

export default OrderApi;
