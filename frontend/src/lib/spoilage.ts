import type { OrderStatus } from '@/types/order.types';

/** FR-122 (spec §4.4.1): a line can be reported until this many days after its good-until date — the server's rule. */
export const REPORT_DAYS_AFTER_BEST_BEFORE = 2;
/** FR-123 (spec §4.4.4): this many strikes that still count lock longer shelf lives. */
export const STRIKES_TO_LOCK = 3;
/** FR-123: a strike counts for this many days. */
export const STRIKE_WINDOW_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

/** "yyyy-MM-dd" plus days, counted on UTC midnights so no time zone or daylight-saving change can shift the date. */
const addDays = (ymd: string, days: number): string => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
};

/** Today in Ho Chi Minh City as "yyyy-MM-dd": the calendar the server checks the window against. */
export const todayInVietnam = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);

/** The last day a line can still be reported. */
export const reportDeadline = (bestBefore: string): string => addDays(bestBefore, REPORT_DAYS_AFTER_BEST_BEFORE);

/**
 * Whether the "Report spoiled" button shows under one line: a completed order, a line with an id and a good-until date
 * (lines placed before the promise existed have none), not reported yet, still inside the window, and — since a farmer
 * can mark an order complete before its own pickup day (M-1) — at least one valid "spoiled on" day actually exists,
 * i.e. pickup has happened by today. Without this, the day select would be empty and the send would 400.
 */
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

/** The days a customer can pick as "spoiled on": from pickup to today, oldest first ("yyyy-MM-dd" sorts as text). */
export function spoiledOnChoices(pickupDate: string, today: string): string[] {
  const days: string[] = [];
  for (let day = pickupDate; day <= today; day = addDays(day, 1)) days.push(day);
  return days;
}
