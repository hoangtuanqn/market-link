import type { StorageMode } from '@/api-requests/shelf-life.requests';
import type { ORDER_STATUS } from '@/constants/enums';

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export type OrderLineType = {
  productId: number;
  qty: number;
  name?: string;
  unit?: string;
  price?: number;
  /** FR-121: the last good day ("yyyy-MM-dd"); null on lines placed before the promise existed. */
  bestBefore?: string | null;
  storageMode?: StorageMode | null;
};

/** [status, timestamp, by] — FR-038: every status change is recorded with who made it. */
export type OrderHistoryEntry = [OrderStatus, string, string];

export type OrderType = {
  /** Numeric id for every API call; the code is only for display. */
  id?: number;
  code: string;
  farmerId: number;
  marketId: number;
  stallName?: string;
  marketName?: string;
  /** `yyyy-MM-dd`; the ticket formats it for the reader. */
  date: string;
  slot: string;
  status: OrderStatus;
  /** ISO instant. */
  cutoff: string;
  /** Cutoff has passed: edit/cancel are gone, contacting the stall is the only option. */
  locked?: boolean;
  items: OrderLineType[];
  /** From the list endpoint, where the lines are not sent. */
  itemCount?: number;
  total?: number;
  /** Set when status is 'declined'. */
  reason?: string;
  /** Set when status is 'completed': has the customer already reviewed it. */
  reviewed?: boolean;
  history: OrderHistoryEntry[];
};
