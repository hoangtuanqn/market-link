import type { OrderListItemDto } from '@/api-requests/order.requests';
import type { ApiResponse, PageType } from '@/types/api.types';
import type { OrderStatus } from '@/types/order.types';
import { privateApi } from '@/utils/axiosInstance';

/** `yyyy-MM-dd` bounds on `pickupDate`; both optional (all time when omitted). */
export type DateRange = { from?: string; to?: string };

/**
 * `GET /farmer/dashboard` (FR-068). `pendingOrders` = orders still `placed`; revenue counts `completed` orders only;
 * `lowStockCount` = available products at or under 5 units.
 */
export type FarmerDashboardDto = {
  totalOrders: number;
  pendingOrders: number;
  revenueTotal: number;
  revenueThisMonth: number;
  completedOrders: number;
  productCount: number;
  lowStockCount: number;
};

/** `GET /farmer/reports/best-sellers` (FR-069): one product, summed over completed orders. */
export type BestSellerDto = { productId: number; name: string; quantitySold: number; revenue: number };

/** `GET /admin/dashboard` (FR-070, contract §10). `totalFarmers` counts approved stalls. */
export type AdminDashboardDto = {
  totalFarmers: number;
  totalCustomers: number;
  totalMarkets: number;
  totalOrders: number;
  revenueTotal: number;
  pendingFarmers: number;
  hiddenListings: number;
};

/** `GET /admin/reports/revenue` (FR-075): every market, completed orders only (0 when none). */
export type RevenueByMarketDto = { marketId: number; marketName: string; orderCount: number; revenue: number };

/** `GET /admin/reports/top-farmers` (FR-075): stalls by completed revenue, highest first. */
export type TopFarmerDto = {
  farmerId: number;
  stallName: string;
  orderCount: number;
  revenue: number;
  ratingAvg: number;
};

/** `GET /admin/customers` row (FR-072). `status` is `active` | `inactive`. */
export type AdminCustomerDto = {
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'suspended';
  orderCount: number;
  createdAt: string;
};

/** FR-068/069 — the signed-in Farmer's own numbers (plan C9, Task 9.1). The stall comes from the token. */
class FarmerReportApi {
  static dashboard = async () => {
    const response = await privateApi.get<ApiResponse<FarmerDashboardDto>>('/farmer/dashboard');
    return response.data.data;
  };

  /** Top products by quantity sold; `limit` 1–20 (default 5). */
  static bestSellers = async (params: DateRange & { limit?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<BestSellerDto[]>>('/farmer/reports/best-sellers', { params });
    return response.data.data;
  };

  /** Completed orders, latest pickup first. `page` starts at 1. */
  static sales = async (params: DateRange & { page?: number; pageSize?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<PageType<OrderListItemDto>>>('/farmer/reports/sales', { params });
    return response.data.data;
  };
}

/** FR-070/072/075 — admin dashboard, platform reports and customer accounts (contract §10). */
class AdminReportApi {
  static dashboard = async () => {
    const response = await privateApi.get<ApiResponse<AdminDashboardDto>>('/admin/dashboard');
    return response.data.data;
  };

  /** Platform-wide orders, newest first; admin is read-only here (D-04). */
  static orders = async (
    params: DateRange & { marketId?: number; status?: OrderStatus; page?: number; pageSize?: number } = {},
  ) => {
    const response = await privateApi.get<ApiResponse<PageType<OrderListItemDto>>>('/admin/reports/orders', { params });
    return response.data.data;
  };

  static revenueByMarket = async (params: DateRange = {}) => {
    const response = await privateApi.get<ApiResponse<RevenueByMarketDto[]>>('/admin/reports/revenue', { params });
    return response.data.data;
  };

  /** `limit` 1–50 (default 10). */
  static topFarmers = async (params: DateRange & { limit?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<TopFarmerDto[]>>('/admin/reports/top-farmers', { params });
    return response.data.data;
  };

  /** `q` matches name, email or phone; `status` filters `active` / `inactive`. `page` starts at 1. */
  static customers = async (
    params: { status?: 'active' | 'inactive'; q?: string; page?: number; pageSize?: number } = {},
  ) => {
    const response = await privateApi.get<ApiResponse<PageType<AdminCustomerDto>>>('/admin/customers', { params });
    return response.data.data;
  };

  /**
   * Activate or deactivate a customer (FR-072). An inactive customer cannot sign in and their refresh tokens are
   * revoked; their orders are untouched. 400 for a stall/admin account or any other status value.
   */
  static setCustomerStatus = async (userId: number, status: 'active' | 'inactive') => {
    const response = await privateApi.patch<ApiResponse<AdminCustomerDto>>(`/admin/customers/${userId}/status`, {
      status,
    });
    return response.data.data;
  };
}

export { AdminReportApi, FarmerReportApi };
