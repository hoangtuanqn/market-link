import OrderApi, { type OrderListItemDto } from '@/api-requests/order.requests';

export type OrderPinSummary = OrderListItemDto;

export async function fetchOrderSummary(orderId: number): Promise<OrderPinSummary> {
  return (await OrderApi.get(orderId)).summary;
}
