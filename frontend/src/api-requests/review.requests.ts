import type { ApiResponse, PageType } from '@/types/api.types';
import { formatDate } from '@/lib/format';
import { privateApi, publicApi } from '@/utils/axiosInstance';

/** What a review is about (contract §8 `targetType`). */
export type ReviewTarget = 'product' | 'farmer';

/** Moderation status of a review (FR-074): a hidden review never appears in the public lists. */
export type ReviewStatus = 'visible' | 'hidden';

/** The stall's single answer under a review (FR-053). `createdAt` is ISO 8601 UTC. */
export type ReviewResponseDto = { id: number; responseText: string; createdAt: string };

/**
 * One review as `GET /products/{id}/reviews`, `GET /farmers/{id}/reviews`, `GET /farmer/reviews` and `POST /reviews`
 * return it (contract §8). `targetId` is the product id or the farmer id (farmer_profiles) according to `targetType`;
 * `targetName` is the product name or the stall name, so a list does not need a second lookup to show what was
 * reviewed. `response` is `null` until the stall answers. Hidden reviews (FR-074) never appear in the public lists.
 */
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

/**
 * One review as `GET /admin/reviews` returns it (contract §8, moderation queue). Unlike `ReviewDto`, this carries the
 * raw `status`, the reviewer's id (to filter by customer) and `stallName` — the stall that owns what was reviewed,
 * which is the target itself for a stall review but the product's own stall for a product review.
 */
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

/** The shape `ReviewCard` takes (design system component `ReviewCard.md`). */
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

/** `ReviewDto`/`AdminReviewDto` (contract) → the shape `ReviewCard` takes. `stallName` names the reply's author. */
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

/** `reviewsSummary` of `GET /products/{id}` (contract §5): average and 1★…5★ histogram of the visible reviews. */
export type ReviewSummaryDto = { ratingAvg: number; ratingCount: number; histogram: number[] };

/**
 * `POST /reviews` body. Exactly one of `productId` (targetType `product`) / `farmerId` (targetType `farmer`) is set;
 * `rating` is 1–5, `comment` up to 2000 characters.
 */
export type CreateReviewInput = {
  orderId: number;
  targetType: ReviewTarget;
  productId?: number;
  farmerId?: number;
  rating: number;
  comment?: string;
};

/**
 * FR-050…053 — reviews and ratings (docs/api-contract.md §8). Reading is public; writing needs a signed-in `CUSTOMER`
 * or `FARMER` (D-13: admin gets 403 from the server whatever the UI shows).
 */
class ReviewApi {
  /** Visible reviews of a product, newest first. `page` starts at 1. */
  static forProduct = async (productId: number, params: { page?: number; pageSize?: number } = {}) => {
    const response = await publicApi.get<ApiResponse<PageType<ReviewDto>>>(`/products/${productId}/reviews`, {
      params,
    });
    return response.data.data;
  };

  /** Visible reviews of a stall (farmer_profiles id), newest first. `page` starts at 1. */
  static forFarmer = async (farmerId: number, params: { page?: number; pageSize?: number } = {}) => {
    const response = await publicApi.get<ApiResponse<PageType<ReviewDto>>>(`/farmers/${farmerId}/reviews`, {
      params,
    });
    return response.data.data;
  };

  /**
   * Review a product or the stall of one of my completed orders. 403 `ORDER_NOT_COMPLETED` before completion, 403
   * `FORBIDDEN` on someone else's order, 400 `TARGET_NOT_IN_ORDER` for a product that was not in it, 409
   * `ALREADY_REVIEWED` the second time.
   */
  static create = async (input: CreateReviewInput) => {
    const response = await privateApi.post<ApiResponse<ReviewDto>>('/reviews', input);
    return response.data.data;
  };

  /** Farmer answers a review about their own stall or product, once. 403 on another stall's review, 409 the second time. */
  static respond = async (reviewId: number, responseText: string) => {
    const response = await privateApi.post<ApiResponse<ReviewResponseDto>>(`/farmer/reviews/${reviewId}/response`, {
      responseText,
    });
    return response.data.data;
  };

  /** Farmer's own review inbox: of their stall and of every one of their products. `page` starts at 1. */
  static mine = async (params: { page?: number; pageSize?: number } = {}) => {
    const response = await privateApi.get<ApiResponse<PageType<ReviewDto>>>('/farmer/reviews', { params });
    return response.data.data;
  };

  /** Admin moderation queue (FR-074): every status by default, filterable by status/rating/reviewer. */
  static adminList = async (
    params: { status?: ReviewStatus; maxRating?: number; customerId?: number; page?: number; pageSize?: number } = {},
  ) => {
    const response = await privateApi.get<ApiResponse<PageType<AdminReviewDto>>>('/admin/reviews', { params });
    return response.data.data;
  };

  /** Admin moderation (FR-074): a hidden review leaves the public lists and the rating averages at once. */
  static hide = async (reviewId: number) => {
    await privateApi.patch<ApiResponse<null>>(`/admin/reviews/${reviewId}/hide`);
  };

  static unhide = async (reviewId: number) => {
    await privateApi.patch<ApiResponse<null>>(`/admin/reviews/${reviewId}/unhide`);
  };
}

export default ReviewApi;
