import type { ItemQualityReportDto } from '@/api-requests/quality-report.requests';
import type { StorageMode } from '@/api-requests/shelf-life.requests';
import type { ApiResponse, PageType } from '@/types/api.types';
import type { OrderHistoryEntry, OrderStatus, OrderType } from '@/types/order.types';
import type { ProductStatus } from '@/types/product.types';
import { privateApi } from '@/utils/axiosInstance';

export type CartLineInput = { productId: number; quantity: number };

export type PickupDateInput = { farmerId: number; date: string };

export type OrderGroupInput = {
  farmerId: number;
  marketId: number;
  slotId?: number | null;
  pickupDate: string;
  items: CartLineInput[];
  customerNote?: string;
};

export type PreviewItemDto = {
  productId: number;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  stockQuantity: number;
  status: ProductStatus;
  listPrice?: number | null;
  discountPercent?: number | null;
  bestBefore?: string | null;
  storageMode?: StorageMode | null;
};

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

export type PlacedOrderDto = {
  orderId: number;
  orderCode: string;
  status: OrderStatus;
  cutoffAt: string;
  totalAmount: number;
};

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
  customerId: number;
  customerName: string;
  reviewed: boolean;
};

export type OrderItemDto = {
  productId: number;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  bestBefore?: string | null;
  storageMode?: StorageMode | null;
  listPrice?: number | null;
  qualityReport?: ItemQualityReportDto | null;
  itemId?: number;
};

export type OrderHistoryDto = {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedAt: string;
  note: string | null;
  changedByName: string | null;
  changedByRole: 'customer' | 'farmer' | 'admin' | null;
};

export type CustomerSummaryDto = { userId: number; fullName: string; phone: string; email: string };

export type OrderDetailDto = {
  summary: OrderListItemDto;
  items: OrderItemDto[];
  statusHistory: OrderHistoryDto[];
  canCancel: boolean;
  canModify: boolean;
  customerNote: string | null;
  farmerNote: string | null;
  customer?: CustomerSummaryDto;
  reviewed: boolean;
};

const pastCutoff = (status: OrderStatus, cutoffAt: string) =>
  (status === 'placed' || status === 'accepted') && Date.now() > Date.parse(cutoffAt);

export const toOrderCard = (dto: OrderListItemDto): OrderType => ({
  id: dto.orderId,
  code: dto.orderCode,
  farmerId: dto.farmerId,
  marketId: dto.marketId,
  stallName: dto.stallName,
  marketName: dto.marketName,
  date: dto.pickupDate,
  slot: `${dto.pickupStart}–${dto.pickupEnd}`,
  status: dto.status,
  cutoff: dto.cutoffAt,
  locked: pastCutoff(dto.status, dto.cutoffAt),
  items: [],
  itemCount: dto.itemCount,
  total: dto.totalAmount,
  reviewed: dto.reviewed,
  history: [],
});

export const toOrder = (dto: OrderDetailDto): OrderType => ({
  id: dto.summary.orderId,
  code: dto.summary.orderCode,
  farmerId: dto.summary.farmerId,
  marketId: dto.summary.marketId,
  stallName: dto.summary.stallName,
  marketName: dto.summary.marketName,
  date: dto.summary.pickupDate,
  slot: `${dto.summary.pickupStart}–${dto.summary.pickupEnd}`,
  status: dto.summary.status,
  cutoff: dto.summary.cutoffAt,
  locked: (dto.summary.status === 'placed' || dto.summary.status === 'accepted') && !dto.canCancel,
  items: dto.items.map((i) => ({
    productId: i.productId,
    qty: i.quantity,
    name: i.productName,
    unit: i.unit,
    price: i.unitPrice,
    bestBefore: i.bestBefore,
    storageMode: i.storageMode,
  })),
  itemCount: dto.summary.itemCount,
  total: dto.summary.totalAmount,
  reviewed: dto.reviewed,
  reason: dto.summary.status === 'declined' ? (dto.farmerNote ?? undefined) : undefined,
  history: dto.statusHistory.map((h): OrderHistoryEntry => [h.toStatus, h.changedAt, h.changedByName ?? '']),
});

class OrderApi {
  static preview = async (items: CartLineInput[], pickupDates: PickupDateInput[] = []) => {
    const response = await privateApi.post<ApiResponse<{ groups: OrderGroupPreviewDto[] }>>('/orders/preview', {
      items,
      ...(pickupDates.length ? { pickupDates } : {}),
    });
    return response.data.data.groups;
  };

  static place = async (groups: OrderGroupInput[]) => {
    const response = await privateApi.post<ApiResponse<{ orders: PlacedOrderDto[] }>>('/orders', { groups });
    return response.data.data.orders;
  };

  static list = async (params: { status?: OrderStatus; page?: number; pageSize?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<PageType<OrderListItemDto>>>('/orders', { params });
    return response.data.data;
  };

  static get = async (id: number) => {
    const response = await privateApi.get<ApiResponse<OrderDetailDto>>(`/orders/${id}`);
    return response.data.data;
  };

  static cancel = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/orders/${id}/cancel`);
    return response.data.data;
  };

  static modifyItems = async (id: number, items: CartLineInput[]) => {
    const response = await privateApi.put<ApiResponse<OrderDetailDto>>(`/orders/${id}/items`, { items });
    return response.data.data;
  };

  static reorder = async (id: number) => {
    const response = await privateApi.post<ApiResponse<CartLineInput[]>>(`/orders/${id}/reorder`);
    return response.data.data;
  };

  static farmerList = async (
    params: { status?: OrderStatus; date?: string; page?: number; pageSize?: number } = {},
  ) => {
    const response = await privateApi.get<ApiResponse<PageType<OrderListItemDto>>>('/farmer/orders', { params });
    return response.data.data;
  };

  static accept = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/farmer/orders/${id}/accept`);
    return response.data.data;
  };

  static decline = async (id: number, reason: string) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/farmer/orders/${id}/decline`, { reason });
    return response.data.data;
  };

  static markReady = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/farmer/orders/${id}/ready`);
    return response.data.data;
  };

  static complete = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<OrderDetailDto>>(`/farmer/orders/${id}/complete`);
    return response.data.data;
  };
}

export default OrderApi;
