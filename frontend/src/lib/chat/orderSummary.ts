import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

/**
 * The `summary` part of `GET /api/v1/orders/{id}` (contract §6) that the order pin needs. The shape was confirmed by
 * the core-commerce session (C5, task 5.4) on 26/09.
 *
 * TEMPORARY SEAM: the real client is `OrderApi.get` in `api-requests/order.requests.ts` (C5 task 5.8), not on dev yet.
 * Chat deliberately does not create that file so the two sessions do not overwrite each other; when it lands, change
 * this function's body to `(await OrderApi.get(orderId)).summary` and delete the type below.
 */
export type OrderPinSummary = {
  orderId: number;
  orderCode: string;
  status: 'placed' | 'accepted' | 'declined' | 'ready' | 'completed' | 'cancelled';
  farmerId: number;
  stallName: string;
  marketName: string;
  /** `yyyy-MM-dd`, a date without a time. */
  pickupDate: string;
  /** `HH:mm`. */
  pickupStart: string;
  pickupEnd: string;
  totalAmount: number;
};

export async function fetchOrderSummary(orderId: number): Promise<OrderPinSummary> {
  const response = await privateApi.get<ApiResponse<{ summary: OrderPinSummary }>>(`/orders/${orderId}`);
  return response.data.data.summary;
}
