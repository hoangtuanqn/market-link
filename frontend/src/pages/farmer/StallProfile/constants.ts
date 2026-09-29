import type { StallDetailDto, StallMarketDto } from '@/api-requests/stall.requests';
import { dayName, formatClock } from '@/lib/format';
import type { MarketType } from '@/types/market.types';

export const FETCH_SIZE = 50;
export const NO_MARKETS: MarketType[] = [];
export const CUTOFF_MIN = 1;
export const CUTOFF_MAX = 72;
export const STALL_CODE_MAX = 30;

export type StallForm = { stallName: string; person: string; about: string; cutoffHours: number };
export type FormErrors = Partial<Record<'stall' | 'person' | 'cut', string>>;
export type MarketSettings = { code: string; days: number[]; start: string; end: string; lat: number; lng: number };

export const SERVER_FIELDS: Record<string, keyof FormErrors> = {
  stallName: 'stall',
  contactPerson: 'person',
  orderCutoffHours: 'cut',
};

export const formFrom = (s: StallDetailDto): StallForm => ({
  stallName: s.stallName,
  person: s.contactPerson,
  about: s.description ?? '',
  cutoffHours: s.orderCutoffHours,
});

export const settingsFrom = (sm: StallMarketDto, market: MarketType | undefined): MarketSettings => ({
  code: sm.stallCode ?? '',
  days: sm.operatingDays.map((d) => d.dayOfWeek),
  start: sm.operatingDays[0]?.pickupStartTime ?? market?.open ?? '06:00',
  end: sm.operatingDays[0]?.pickupEndTime ?? market?.close ?? '10:00',
  lat: sm.stallLatitude != null ? Number(sm.stallLatitude) : (market?.lat ?? 10.7769),
  lng: sm.stallLongitude != null ? Number(sm.stallLongitude) : (market?.lng ?? 106.7009),
});

export function cutoffExample(hours: number) {
  const slotMinutes = 7 * 60;
  let cutoffMinutes = slotMinutes - hours * 60;
  let dayBefore = false;
  while (cutoffMinutes < 0) {
    cutoffMinutes += 24 * 60;
    dayBefore = true;
  }
  const time = `${String(Math.floor(cutoffMinutes / 60)).padStart(2, '0')}:${String(cutoffMinutes % 60).padStart(2, '0')}`;
  return { time: formatClock(time), day: dayName(dayBefore ? 5 : 6, 'long') };
}

export const STATUS_CLASS: Record<StallDetailDto['approvalStatus'], string> = {
  approved: 'bg-status-completed-bg text-status-completed-ink',
  pending: 'bg-status-placed-bg text-status-placed-ink',
  rejected: 'bg-status-declined-bg text-status-declined-ink',
  suspended: 'bg-status-declined-bg text-status-declined-ink',
};
