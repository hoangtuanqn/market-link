export const USER_ROLE = {
  CUSTOMER: 'customer',
  FARMER: 'farmer',
  ADMIN: 'admin',
} as const;

export const PRODUCT_STATUS = {
  AVAILABLE: 'available',
  SOLD_OUT: 'sold_out',
  UNAVAILABLE: 'unavailable',
} as const;

/** D-04 order lifecycle. */
export const ORDER_STATUS = {
  PLACED: 'placed',
  ACCEPTED: 'accepted',
  READY: 'ready',
  COMPLETED: 'completed',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
} as const;
