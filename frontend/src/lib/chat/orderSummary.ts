import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

/**
 * Phần `summary` của `GET /api/v1/orders/{id}` (contract §6) mà thẻ ghim đơn cần. Hình dạng do phiên core-commerce (C5,
 * task 5.4) xác nhận 26/09.
 *
 * CHỖ NỐI TẠM: client chính thức là `OrderApi.get` trong `api-requests/order.requests.ts` (C5 task 5.8), chưa vào dev.
 * Chat cố ý không tạo file đó để hai phiên không đè nhau; khi nó vào dev, đổi thân hàm này thành `(await
 * OrderApi.get(orderId)).summary` và xoá type ở dưới.
 */
export type OrderPinSummary = {
  orderId: number;
  orderCode: string;
  status: 'placed' | 'accepted' | 'declined' | 'ready' | 'completed' | 'cancelled';
  farmerId: number;
  stallName: string;
  marketName: string;
  /** `yyyy-MM-dd`, ngày không giờ. */
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
