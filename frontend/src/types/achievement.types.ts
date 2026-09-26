/** Buyer achievement tier, low → high (matches the backend Tier enum). */
export const TIERS = ['bronze', 'silver', 'gold', 'diamond'] as const;
export type Tier = (typeof TIERS)[number];

/**
 * GET /auth/me/achievements. `available` is false when the backend cannot read orders yet (the orders table does not
 * exist).
 */
export type AchievementType = {
  available: boolean;
  tier: Tier;
  completed: number;
  cancelled: number;
  declined: number;
  inProgress: number;
  /** ₫, sums completed orders only */
  totalSpent: number;
  /** %, null when there is no completed or self-cancelled order yet */
  completionRate: number | null;
  /** Null at the highest tier (or when there is no data) */
  next: { tier: Tier; ordersNeeded: number; spendNeeded: number; completionRateNeeded: number | null } | null;
};
