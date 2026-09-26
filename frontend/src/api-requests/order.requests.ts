import type { ApiResponse, PageType } from '@/types/api.types';
import type { OrderHistoryEntry, OrderStatus, OrderType } from '@/types/order.types';
import type { ProductStatus } from '@/types/product.types';
import { privateApi } from '@/utils/axiosInstance';

/** One cart line sent to the server: preview, place or edit an order (contract §7). */
export type CartLineInput = { productId: number; quantity: number };

/** One order in a place call: one stall, one market, one slot (D-01). */
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
 * One line of a preview group. `status` is the real sellable status: a hidden or deleted product shows `unavailable`
 * even though its status column is still `available` (C5-12).
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
 * One order the cart will be split into when placed (D-01). `problems` collects the group's issues (`out_of_stock`,
 * `sold_out`, `unavailable`, `stall_suspended`) instead of throwing. `markets` are the markets the stall sells at;
 * `marketId` / `marketName` are only set when the stall sells at exactly one market (C5-11).
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

/** A newly created order. `cutoffAt` is ISO 8601 UTC ("2026-09-28T12:00:00Z"). */
export type PlacedOrderDto = {
  orderId: number;
  orderCode: string;
  status: OrderStatus;
  cutoffAt: string;
  totalAmount: number;
};

/**
 * One row of an order list — the customer's (`GET /orders`) or the Farmer's (`GET /farmer/orders`). Dates "yyyy-MM-dd",
 * times "HH:mm"; `cutoffAt`/`createdAt` are ISO 8601 UTC (C5-15).
 */
export type OrderListItemDto = {
  orderId: number;
  orderCode: string;
  status: OrderStatus;
  farmerId: number;
  stallName: string;
  marketId: number;
  marketName: string;
  pickupDate: string;
  pickupStart: string;
  pickupEnd: string;
  cutoffAt: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
};

/** One `order_items` line — name/price/unit as copied at order time (contract §7). */
export type OrderItemDto = {
  productId: number;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

/**
 * One `order_status_history` row (FR-038). `fromStatus` is `null` on the first row (at placement). `changedByRole` is
 * `customer|farmer|admin`, `null` when the system made the change.
 */
export type OrderHistoryDto = {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedAt: string;
  note: string | null;
  changedByName: string | null;
  changedByRole: 'customer' | 'farmer' | 'admin' | null;
};

/** The customer's contact — only the order's Farmer sees it (FR-036). */
export type CustomerSummaryDto = { userId: number; fullName: string; phone: string; email: string };

/**
 * `GET /orders/{id}` (contract §7, FR-033/036/065). `customer` is absent from the JSON entirely when the caller is not
 * this order's own Farmer (C5-16) — an optional field, not `null`.
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

/** Contract (camelCase) → the `OrderType` shape the pages use. The only place that knows both. */
export const toOrder = (dto: OrderDetailDto): OrderType => ({
  code: dto.summary.orderCode,
  farmerId: dto.summary.farmerId,
  marketId: dto.summary.marketId,
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
 * I-1 — `toOrder` drops `orderId`, and `OrderType` (types/order.types.ts) has no place for the id. Notification links
 * (backend) and every `OrderApi` call (`get`/`cancel`/`modifyItems`/...) need the numeric id, not `orderCode` — use
 * this function where both are needed instead of `toOrder` alone.
 */
export const toOrderView = (dto: OrderDetailDto): { id: number; order: OrderType } => ({
  id: dto.summary.orderId,
  order: toOrder(dto),
});

/**
 * FR-030…039, 065…067 — cart, the customer's and the Farmer's orders (docs/api-contract.md §7). Every function needs a
 * signed-in user (`privateApi`): buying is open to `CUSTOMER` and `FARMER` (D-13), an admin is blocked by the server →
 * 403.
 */
class OrderApi {
  /**
   * Which orders the cart will be split into; each order's issues live in `problems`, nothing is thrown. 400
   * `VALIDATION_ERROR` when a `productId` does not exist.
   */
  static preview = async (items: CartLineInput[]) => {
    const response = await privateApi.post<ApiResponse<{ groups: OrderGroupPreviewDto[] }>>('/orders/preview', {
      items,
    });
    return response.data.data.groups;
  };

  /**
   * Places the whole cart: one order per group, the whole call in one transaction (D-01, D-02). 409 `OUT_OF_STOCK` /
   * `SLOT_FULL` / `SLOT_UNAVAILABLE` / `CUTOFF_PASSED` / `STALL_UNAVAILABLE`.
   */
  static place = async (groups: OrderGroupInput[]) => {
    const response = await privateApi.post<ApiResponse<{ orders: PlacedOrderDto[] }>>('/orders', { groups });
    return response.data.data.orders;
  };

  /** The caller's own orders as the buyer (D-13: a Farmer also buys), newest first. `page` starts at 1. */
  static list = async (params: { status?: OrderStatus; page?: number; pageSize?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<PageType<OrderListItemDto>>>('/orders', { params });
    return response.data.data;
  };

  /** Only the order's buyer or owning Farmer can read it (R-06); anyone else gets 403, even when the id exists. */
  static get = async (id: number) => {
    const response = await privateApi.get<ApiResponse<OrderDetailDto>>(`/orders/${id}`);
    return response.data.data;
  };

  /**
   * FR-034 — only the buyer can cancel their own order, before the cutoff. Wrong owner → 403; wrong status → 409
   * `INVALID_TRANSITION`; past the cutoff → 409 `CUTOFF_PASSED`.
   */
  static cancel = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/orders/${id}/cancel`);
    return response.data.data;
  };

  /**
   * FR-035 — change quantities or drop items before the cutoff, never add a new product (D-07). 400
   * `PRODUCT_NOT_IN_ORDER` when adding a new product; 409 `OUT_OF_STOCK` when raising a product that is no longer sold;
   * 409 `CUTOFF_PASSED`.
   */
  static modifyItems = async (id: number, items: CartLineInput[]) => {
    const response = await privateApi.put<ApiResponse<OrderDetailDto>>(`/orders/${id}/items`, { items });
    return response.data.data;
  };

  /**
   * FR-037 — "Order again": the old order's lines as a suggested cart (creates nothing). Lines that can no longer be
   * bought are left out and quantities are capped at current stock, so compare with the old order to explain what
   * changed. Pass the result to `preview`. 403 when the order is not the caller's.
   */
  static reorder = async (id: number) => {
    const response = await privateApi.post<ApiResponse<CartLineInput[]>>(`/orders/${id}/reorder`);
    return response.data.data;
  };

  /** Farmer — orders placed at their own stall, filtered by status and pickup date (`pickup_date`). */
  static farmerList = async (
    params: { status?: OrderStatus; date?: string; page?: number; pageSize?: number } = {},
  ) => {
    const response = await privateApi.get<ApiResponse<PageType<OrderListItemDto>>>('/farmer/orders', { params });
    return response.data.data;
  };

  /** `placed → accepted`. Wrong owner → 403; wrong status → 409 `INVALID_TRANSITION`. */
  static accept = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/farmer/orders/${id}/accept`);
    return response.data.data;
  };

  /** `placed → declined`, restores stock. `reason` is required, at most 255 characters (400 `VALIDATION_ERROR`). */
  static decline = async (id: number, reason: string) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/farmer/orders/${id}/decline`, { reason });
    return response.data.data;
  };

  /** `accepted → ready`. Wrong status → 409 `INVALID_TRANSITION`. */
  static markReady = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/farmer/orders/${id}/ready`);
    return response.data.data;
  };

  /** `ready → completed` (D-03). Wrong status → 409 `INVALID_TRANSITION`. */
  static complete = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/farmer/orders/${id}/complete`);
    return response.data.data;
  };
}

export default OrderApi;
