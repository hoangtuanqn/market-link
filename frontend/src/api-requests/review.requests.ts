import type { ApiResponse, PageType } from '@/types/api.types';
import { formatDate } from '@/lib/format';
import { privateApi, publicApi } from '@/utils/axiosInstance';

export type ReviewTarget = 'product' | 'farmer';

export type ReviewStatus = 'visible' | 'hidden';

export type ReviewResponseDto = { id: number; responseText: string; createdAt: string };

export type ReviewDto = {
  id: number;
  targetType: ReviewTarget;
  targetId: number;
  targetName: string;
  customerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  response: ReviewResponseDto | null;
};

export type AdminReviewDto = {
  id: number;
  targetType: ReviewTarget;
  targetId: number;
  targetName: string;
  stallName: string;
  customerId: number;
  customerName: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  response: ReviewResponseDto | null;
};

export type ReviewCardData = {
  id: number;
  author: string;
  date: string;
  target: string;
  targetType: ReviewTarget;
  rating: number;
  text: string;
  reply?: { by: string; date: string; text: string };
};

export const toReviewCard = (dto: ReviewDto | AdminReviewDto, stallName: string): ReviewCardData => ({
  id: dto.id,
  author: dto.customerName,
  date: formatDate(new Date(dto.createdAt)),
  target: dto.targetName,
  targetType: dto.targetType,
  rating: dto.rating,
  text: dto.comment ?? '',
  reply: dto.response
    ? { by: stallName, date: formatDate(new Date(dto.response.createdAt)), text: dto.response.responseText }
    : undefined,
});

export type ReviewSummaryDto = { ratingAvg: number; ratingCount: number; histogram: number[] };

export type CreateReviewInput = {
  orderId: number;
  targetType: ReviewTarget;
  productId?: number;
  farmerId?: number;
  rating: number;
  comment?: string;
};

class ReviewApi {
  static forProduct = async (productId: number, params: { page?: number; pageSize?: number } = {}) => {
    const response = await publicApi.get<ApiResponse<PageType<ReviewDto>>>(`/products/${productId}/reviews`, {
      params,
    });
    return response.data.data;
  };

  static forFarmer = async (farmerId: number, params: { page?: number; pageSize?: number } = {}) => {
    const response = await publicApi.get<ApiResponse<PageType<ReviewDto>>>(`/farmers/${farmerId}/reviews`, {
      params,
    });
    return response.data.data;
  };

  static create = async (input: CreateReviewInput) => {
    const response = await privateApi.post<ApiResponse<ReviewDto>>('/reviews', input);
    return response.data.data;
  };

  static respond = async (reviewId: number, responseText: string) => {
    const response = await privateApi.post<ApiResponse<ReviewResponseDto>>(`/farmer/reviews/${reviewId}/response`, {
      responseText,
    });
    return response.data.data;
  };

  static mine = async (params: { page?: number; pageSize?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<PageType<ReviewDto>>>('/farmer/reviews', { params });
    return response.data.data;
  };

  static adminList = async (
    params: { status?: ReviewStatus; maxRating?: number; customerId?: number; page?: number; pageSize?: number } = {},
  ) => {
    const response = await privateApi.get<ApiResponse<PageType<AdminReviewDto>>>('/admin/reviews', { params });
    return response.data.data;
  };

  static hide = async (reviewId: number) => {
    await privateApi.patch<ApiResponse<null>>(`/admin/reviews/${reviewId}/hide`);
  };

  static unhide = async (reviewId: number) => {
    await privateApi.patch<ApiResponse<null>>(`/admin/reviews/${reviewId}/unhide`);
  };
}

export default ReviewApi;
