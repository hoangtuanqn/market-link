// The sample-data lookup functions are all pure: NO_SIDE_EFFECTS lets the production build drop them (config/wip.ts).
import type { Tier } from '@/types/achievement.types';

/**
 * Sample buyer tiers in the demo data, looked up by display name. Once the reviews, orders and messages API returns
 * `tier` (backend: AchievementService.tiersFor) delete this file and read the tier from the response.
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
