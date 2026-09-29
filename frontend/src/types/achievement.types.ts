export const TIERS = ['bronze', 'silver', 'gold', 'diamond'] as const;
export type Tier = (typeof TIERS)[number];

export type AchievementType = {
  available: boolean;
  tier: Tier;
  completed: number;
  cancelled: number;
  declined: number;
  inProgress: number;
  totalSpent: number;
  completionRate: number | null;
  next: { tier: Tier; ordersNeeded: number; spendNeeded: number; completionRateNeeded: number | null } | null;
};
