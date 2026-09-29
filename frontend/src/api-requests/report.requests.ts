import type { OrderListItemDto } from '@/api-requests/order.requests';
import type { ApiResponse, PageType } from '@/types/api.types';
import type { OrderStatus } from '@/types/order.types';
import { privateApi } from '@/utils/axiosInstance';

export type DateRange = { from?: string; to?: string };

export type FarmerDashboardDto = {
  totalOrders: number;
  pendingOrders: number;
  revenueTotal: number;
  revenueThisMonth: number;
  completedOrders: number;
  productCount: number;
  lowStockCount: number;
};

export type BestSellerDto = { productId: number; name: string; quantitySold: number; revenue: number };

export type AdminDashboardDto = {
  totalFarmers: number;
  totalCustomers: number;
  totalMarkets: number;
  totalOrders: number;
  revenueTotal: number;
  pendingFarmers: number;
  hiddenListings: number;
};

export type RevenueByMarketDto = { marketId: number; marketName: string; orderCount: number; revenue: number };

export type TopFarmerDto = {
  farmerId: number;
  stallName: string;
  orderCount: number;
  revenue: number;
  ratingAvg: number;
};

export type AdminCustomerDto = {
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'suspended';
  orderCount: number;
  createdAt: string;
  avatarUrl?: string | null;
};

export type AdminCustomerStatusHistoryDto = {
  id: number;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
  until: string | null;
  changedByName: string | null;
  changedAt: string;
};

export type TopProductDto = {
  productId: number;
  name: string;
  stallName: string;
  unit: string;
  unitPrice: number;
  quantitySold: number;
  revenue: number;
};

class FarmerReportApi {
  static dashboard = async () => {
    const response = await privateApi.get<ApiResponse<FarmerDashboardDto>>('/farmer/dashboard');
    return response.data.data;
  };

  static bestSellers = async (params: DateRange & { limit?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<BestSellerDto[]>>('/farmer/reports/best-sellers', { params });
    return response.data.data;
  };

  static sales = async (params: DateRange & { page?: number; pageSize?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<PageType<OrderListItemDto>>>('/farmer/reports/sales', { params });
    return response.data.data;
  };
}

class AdminReportApi {
  static dashboard = async () => {
    const response = await privateApi.get<ApiResponse<AdminDashboardDto>>('/admin/dashboard');
    return response.data.data;
  };

  static orders = async (
    params: DateRange & {
      marketId?: number;
      status?: OrderStatus;
      customerId?: number;
      page?: number;
      pageSize?: number;
    } = {},
  ) => {
    const response = await privateApi.get<ApiResponse<PageType<OrderListItemDto>>>('/admin/reports/orders', { params });
    return response.data.data;
  };

  static revenueByMarket = async (params: DateRange = {}) => {
    const response = await privateApi.get<ApiResponse<RevenueByMarketDto[]>>('/admin/reports/revenue', { params });
    return response.data.data;
  };

  static topFarmers = async (params: DateRange & { limit?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<TopFarmerDto[]>>('/admin/reports/top-farmers', { params });
    return response.data.data;
  };

  static topProducts = async (params: DateRange & { limit?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<TopProductDto[]>>('/admin/reports/top-products', { params });
    return response.data.data;
  };

  static customers = async (
    params: { status?: 'active' | 'inactive'; q?: string; page?: number; pageSize?: number } = {},
  ) => {
    const response = await privateApi.get<ApiResponse<PageType<AdminCustomerDto>>>('/admin/customers', { params });
    return response.data.data;
  };

  static customer = async (id: number) => {
    const response = await privateApi.get<ApiResponse<AdminCustomerDto>>(`/admin/customers/${id}`);
    return response.data.data;
  };

  static setCustomerStatus = async (
    userId: number,
    status: 'active' | 'inactive',
    reason: string | null = null,
    until: string | null = null,
  ) => {
    const response = await privateApi.patch<ApiResponse<AdminCustomerDto>>(`/admin/customers/${userId}/status`, {
      status,
      reason,
      until,
    });
    return response.data.data;
  };

  static customerStatusHistory = async (userId: number, page = 1, pageSize = 20) => {
    const response = await privateApi.get<ApiResponse<PageType<AdminCustomerStatusHistoryDto>>>(
      `/admin/customers/${userId}/status-history`,
      { params: { page, pageSize } },
    );
    return response.data.data;
  };
}

export { AdminReportApi, FarmerReportApi };
