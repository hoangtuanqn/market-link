import { formatDayMonth, weekday } from '@/lib/format';

/**
 * A pickup date from the API ("yyyy-MM-dd") → "Sat 03/10" in the reader's language and date order, for labels that say
 * which day a stock number is for. Parsed as a local calendar date (`new Date('2026-10-03')` would be midnight UTC and
 * can land on the day before). Null when there is no date or it is not ISO.
 */
export function stockDay(ymd?: string | null): string | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${weekday(date)} ${formatDayMonth(date)}`;
}
