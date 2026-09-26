import OrderApi, { type OrderListItemDto } from '@/api-requests/order.requests';

/**
 * The part of an order the chat order pin shows (FR-114): the `summary` of `GET /api/v1/orders/{id}`. The server lets
 * the buyer and the stall owner read it; anyone else gets 403, which the pin shows as a fallback line.
 */
export type OrderPinSummary = OrderListItemDto;

export async function fetchOrderSummary(orderId: number): Promise<OrderPinSummary> {
  return (await OrderApi.get(orderId)).summary;
}
