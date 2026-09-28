import type { StorageMode } from '@/api-requests/shelf-life.requests';
import type { ApiResponse, PageType } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

/** FR-122: what the customer saw (spec §4.4.1). */
export type QualityProblem = 'bruised' | 'mold' | 'smell' | 'wilted' | 'other';
export const QUALITY_PROBLEMS: QualityProblem[] = ['bruised', 'mold', 'smell', 'wilted', 'other'];

/** `open` until an admin decides; `confirmed` or `dismissed` after (FR-123). */
export type QualityReportStatus = 'open' | 'confirmed' | 'dismissed';

/** The report on one order line: inside every line of `GET /orders/{id}` (null until reported) and the create reply. */
export type ItemQualityReportDto = {
  id: number;
  status: QualityReportStatus;
  /** "yyyy-MM-dd". */
  spoiledOn: string;
  problem: QualityProblem;
};

export type CreateQualityReportInput = {
  /** "yyyy-MM-dd", from the pickup day to today. */
  spoiledOn: string;
  problem: QualityProblem;
  /** At most 500 characters. */
  note?: string;
  /** A URL `uploadPhoto` returned to this same account. */
  photoUrl?: string;
};

/** One report as the stall and the admin read it (FR-122, FR-123). Dates "yyyy-MM-dd"; `…At` are ISO 8601 UTC. */
export type QualityReportDto = {
  id: number;
  orderId: number;
  orderCode: string;
  farmerId: number;
  stallName: string;
  /** The stall's approval status; the "Suspend stall" button needs `approved`. */
  stallStatus: string;
  customerName: string;
  productId: number;
  productName: string;
  pickupDate: string;
  bestBefore: string | null;
  storageMode: StorageMode | null;
  spoiledOn: string;
  /** Spoiled on or before the good-until date. */
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
  /** The stall's strikes of the last 90 days. */
  stallActiveStrikes: number;
};

/** FR-123: the stall's strikes; `extensionLockedUntil` (ISO 8601) is set while 3 or more still count. */
export type ShelfLifeStandingDto = {
  activeViolations: number;
  limit: number;
  windowDays: number;
  extensionLockedUntil: string | null;
};

export type FarmerQualityReportsDto = { standing: ShelfLifeStandingDto; reports: PageType<QualityReportDto> };

/** "Needs a decision" = `{ status: 'open', escalated: true }`; `decided` = confirmed or dismissed (spec §4.4.3). */
export type AdminQualityFilter = {
  status?: QualityReportStatus | 'decided';
  escalated?: boolean;
  page?: number;
  pageSize?: number;
};

/** A stored photo path ("/uploads/…") → the address the browser loads it from. */
export const reportPhotoSrc = (url: string) => `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}${url}`;

/** FR-122, FR-123 — spoiled produce reports and shelf-life strikes (docs/api-contract.md §8a). */
class QualityReportApi {
  /** Customer: upload the photo first. 400 `VALIDATION_ERROR` on `file` for another type or over 5 MB. */
  static uploadPhoto = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await privateApi.post<ApiResponse<{ url: string }>>('/quality-reports/photos', form, {
      // Drop the default application/json header so the browser sets multipart/form-data with the boundary itself.
      headers: { 'Content-Type': undefined },
    });
    return response.data.data.url;
  };

  /**
   * Customer: report one line of a completed order. 403 on someone else's order; 409 `ORDER_NOT_COMPLETED`,
   * `REPORT_WINDOW_CLOSED`, `ALREADY_REPORTED`; 400 on `spoiledOn` / `photoUrl`.
   */
  static create = async (orderId: number, itemId: number, input: CreateQualityReportInput) => {
    const response = await privateApi.post<ApiResponse<ItemQualityReportDto>>(
      `/orders/${orderId}/items/${itemId}/quality-report`,
      input,
    );
    return response.data.data;
  };

  /** Farmer: the reports about their stall, newest first, with the stall's strikes. */
  static mine = async (params: { page?: number; pageSize?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<FarmerQualityReportsDto>>('/farmer/quality-reports', {
      params,
    });
    return response.data.data;
  };

  /** Farmer: only the strikes and the lock (the product form and the overview need nothing else). */
  static standing = async () => (await QualityReportApi.mine({ page: 1, pageSize: 1 })).standing;

  /** Farmer: write or replace the reply while the report is open. 409 `REPORT_ALREADY_DECIDED` after the decision. */
  static respond = async (id: number, response: string) => {
    const result = await privateApi.put<ApiResponse<QualityReportDto>>(`/farmer/quality-reports/${id}/response`, {
      response,
    });
    return result.data.data;
  };

  /** Admin queue, newest first. */
  static adminList = async (params: AdminQualityFilter = {}) => {
    const response = await privateApi.get<ApiResponse<PageType<QualityReportDto>>>('/admin/quality-reports', {
      params,
    });
    return response.data.data;
  };

  /** Admin: confirm the violation; the note is optional. 409 `REPORT_ALREADY_DECIDED`. */
  static confirm = async (id: number, note?: string) => {
    const response = await privateApi.patch<ApiResponse<QualityReportDto>>(`/admin/quality-reports/${id}/confirm`, {
      note,
    });
    return response.data.data;
  };

  /** Admin: not the stall's fault; the note is required (400 on `note`). */
  static dismiss = async (id: number, note: string) => {
    const response = await privateApi.patch<ApiResponse<QualityReportDto>>(`/admin/quality-reports/${id}/dismiss`, {
      note,
    });
    return response.data.data;
  };
}

export default QualityReportApi;
