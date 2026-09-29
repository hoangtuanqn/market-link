import type { StorageMode } from '@/api-requests/shelf-life.requests';
import type { ApiResponse, PageType } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

export type QualityProblem = 'bruised' | 'mold' | 'smell' | 'wilted' | 'other';
export const QUALITY_PROBLEMS: QualityProblem[] = ['bruised', 'mold', 'smell', 'wilted', 'other'];

export type QualityReportStatus = 'open' | 'confirmed' | 'dismissed';

export type ItemQualityReportDto = {
  id: number;
  status: QualityReportStatus;
  spoiledOn: string;
  problem: QualityProblem;
};

export type CreateQualityReportInput = {
  spoiledOn: string;
  problem: QualityProblem;
  note?: string;
  photoUrl?: string;
};

export type QualityReportDto = {
  id: number;
  orderId: number;
  orderCode: string;
  farmerId: number;
  stallName: string;
  stallStatus: string;
  customerName: string;
  productId: number;
  productName: string;
  pickupDate: string;
  bestBefore: string | null;
  storageMode: StorageMode | null;
  spoiledOn: string;
  beforePromise: boolean;
  problem: QualityProblem;
  note: string | null;
  photoUrl: string | null;
  shelfLifeExtended: boolean;
  extendedByDays: number;
  status: QualityReportStatus;
  farmerResponse: string | null;
  farmerRespondedAt: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  stallActiveStrikes: number;
};

export type ShelfLifeStandingDto = {
  activeViolations: number;
  limit: number;
  windowDays: number;
  extensionLockedUntil: string | null;
};

export type FarmerQualityReportsDto = { standing: ShelfLifeStandingDto; reports: PageType<QualityReportDto> };

export type AdminQualityFilter = {
  status?: QualityReportStatus | 'decided';
  escalated?: boolean;
  page?: number;
  pageSize?: number;
};

export const reportPhotoSrc = (url: string) => `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}${url}`;

class QualityReportApi {
  static uploadPhoto = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await privateApi.post<ApiResponse<{ url: string }>>('/quality-reports/photos', form, {
      headers: { 'Content-Type': undefined },
    });
    return response.data.data.url;
  };

  static create = async (orderId: number, itemId: number, input: CreateQualityReportInput) => {
    const response = await privateApi.post<ApiResponse<ItemQualityReportDto>>(
      `/orders/${orderId}/items/${itemId}/quality-report`,
      input,
    );
    return response.data.data;
  };

  static mine = async (params: { page?: number; pageSize?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<FarmerQualityReportsDto>>('/farmer/quality-reports', {
      params,
    });
    return response.data.data;
  };

  static standing = async () => (await QualityReportApi.mine({ page: 1, pageSize: 1 })).standing;

  static respond = async (id: number, response: string) => {
    const result = await privateApi.put<ApiResponse<QualityReportDto>>(`/farmer/quality-reports/${id}/response`, {
      response,
    });
    return result.data.data;
  };

  static adminList = async (params: AdminQualityFilter = {}) => {
    const response = await privateApi.get<ApiResponse<PageType<QualityReportDto>>>('/admin/quality-reports', {
      params,
    });
    return response.data.data;
  };

  static confirm = async (id: number, note?: string) => {
    const response = await privateApi.patch<ApiResponse<QualityReportDto>>(`/admin/quality-reports/${id}/confirm`, {
      note,
    });
    return response.data.data;
  };

  static dismiss = async (id: number, note: string) => {
    const response = await privateApi.patch<ApiResponse<QualityReportDto>>(`/admin/quality-reports/${id}/dismiss`, {
      note,
    });
    return response.data.data;
  };
}

export default QualityReportApi;
