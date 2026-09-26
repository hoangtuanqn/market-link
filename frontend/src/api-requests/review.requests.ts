import type { ApiResponse, PageType } from '@/types/api.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';

/** What a review is about (contract §8 `targetType`). */
export type ReviewTarget = 'product' | 'farmer';

/** The stall's single answer under a review (FR-053). `createdAt` is ISO 8601 UTC. */
export type ReviewResponseDto = { id: number; responseText: string; createdAt: string };

/**
 * One review as `GET /products/{id}/reviews`, `GET /farmers/{id}/reviews` and `POST /reviews` return it (contract §8).
 * `targetId` is the product id or the farmer id (farmer_profiles) according to `targetType`; `response` is `null` until
 * the stall answers. Hidden reviews (FR-074) never appear in the public lists.
 */
export type ReviewDto = {
  id: number;
  targetType: ReviewTarget;
  targetId: number;
  customerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  response: ReviewResponseDto | null;
};

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

  /** Admin moderation (FR-074): a hidden review leaves the public lists and the rating averages at once. */
  static hide = async (reviewId: number) => {
    await privateApi.patch<ApiResponse<null>>(`/admin/reviews/${reviewId}/hide`);
  };

  static unhide = async (reviewId: number) => {
    await privateApi.patch<ApiResponse<null>>(`/admin/reviews/${reviewId}/unhide`);
  };
}

export default ReviewApi;
