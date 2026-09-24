import type { ORDER_STATUS } from '@/constants/enums';

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export type OrderLineType = { productId: number; qty: number };

/** [status, timestamp, by] — FR-038: every status change is recorded with who made it. */
export type OrderHistoryEntry = [OrderStatus, string, string];

export type OrderType = {
  code: string;
  farmerId: number;
  marketId: number;
  date: string;
  slot: string;
  status: OrderStatus;
  cutoff: string;
  /** Cutoff has passed: edit/cancel are gone, contacting the stall is the only option. */
  locked?: boolean;
  items: OrderLineType[];
  /** Set when status is 'declined'. */
  reason?: string;
  /** Set when status is 'completed': has the customer already reviewed it. */
  reviewed?: boolean;
  history: OrderHistoryEntry[];
};
