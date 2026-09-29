import type { StorageMode } from '@/api-requests/shelf-life.requests';
import type { ORDER_STATUS } from '@/constants/enums';

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export type OrderLineType = {
  productId: number;
  qty: number;
  name?: string;
  unit?: string;
  price?: number;
  bestBefore?: string | null;
  storageMode?: StorageMode | null;
};

export type OrderHistoryEntry = [OrderStatus, string, string];

export type OrderType = {
  id?: number;
  code: string;
  farmerId: number;
  marketId: number;
  stallName?: string;
  marketName?: string;
  date: string;
  slot: string;
  status: OrderStatus;
  cutoff: string;
  locked?: boolean;
  items: OrderLineType[];
  itemCount?: number;
  total?: number;
  reason?: string;
  reviewed?: boolean;
  history: OrderHistoryEntry[];
};
