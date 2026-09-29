import type { OrderStatus } from '@/types/order.types';

export const REPORT_DAYS_AFTER_BEST_BEFORE = 2;
export const STRIKES_TO_LOCK = 3;
export const STRIKE_WINDOW_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

const addDays = (ymd: string, days: number): string => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
};

export const todayInVietnam = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);

export const reportDeadline = (bestBefore: string): string => addDays(bestBefore, REPORT_DAYS_AFTER_BEST_BEFORE);

export function canReportSpoilage(
  status: OrderStatus,
  line: { bestBefore?: string | null; qualityReport?: unknown; itemId?: number },
  today: string,
  pickupDate: string,
): boolean {
  return (
    status === 'completed' &&
    line.itemId != null &&
    !!line.bestBefore &&
    !line.qualityReport &&
    pickupDate <= today &&
    today <= reportDeadline(line.bestBefore)
  );
}

export function spoiledOnChoices(pickupDate: string, today: string): string[] {
  const days: string[] = [];
  for (let day = pickupDate; day <= today; day = addDays(day, 1)) days.push(day);
  return days;
}
