// Hàm tra cứu dữ liệu mẫu đều thuần: NO_SIDE_EFFECTS cho phép build production bỏ chúng (config/wip.ts).
import type { Tier } from '@/types/achievement.types';

/**
 * Hạng mẫu của người mua trong dữ liệu demo, tra theo tên hiển thị. Khi API đánh giá, đơn hàng và tin nhắn trả `tier`
 * (backend: AchievementService.tiersFor) thì bỏ file này và đọc hạng từ response.
 */
const DEMO_TIERS: Record<string, Tier> = {
  'Minh Anh': 'gold',
  'Phạm Minh Anh': 'gold',
  'Lan Hương': 'silver',
  'Lê Lan Hương': 'silver',
  'Quốc Bảo': 'diamond',
  'Thu Thảo': 'bronze',
  'Hồng Nhung': 'silver',
  'Văn Long': 'bronze',
  'Bích Ngọc': 'gold',
  'Minh Khang': 'silver',
  'Nguyễn Minh Khang': 'silver',
  'Kim Chi': 'bronze',
  'Trần Phúc': 'diamond',
  'Đức Anh': 'bronze',
};

/* @__NO_SIDE_EFFECTS__ */
export const demoTierOf = (name: string): Tier | undefined => DEMO_TIERS[name];
