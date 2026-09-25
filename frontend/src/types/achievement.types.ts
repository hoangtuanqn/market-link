/** Hạng thành tích của người mua, thấp → cao (khớp enum Tier ở backend). */
export const TIERS = ['bronze', 'silver', 'gold', 'diamond'] as const;
export type Tier = (typeof TIERS)[number];

/** GET /auth/me/achievements. `available` false khi backend chưa đọc được đơn hàng (bảng orders chưa có). */
export type AchievementType = {
  available: boolean;
  tier: Tier;
  completed: number;
  cancelled: number;
  declined: number;
  inProgress: number;
  /** ₫, chỉ cộng đơn hoàn tất */
  totalSpent: number;
  /** %, null khi chưa có đơn nào hoàn tất hoặc tự huỷ */
  completionRate: number | null;
  /** Null ở hạng cao nhất (hoặc khi không có số liệu) */
  next: { tier: Tier; ordersNeeded: number; spendNeeded: number; completionRateNeeded: number | null } | null;
};
