import { formatDayMonth, weekday } from '@/lib/format';

export function stockDay(ymd?: string | null): string | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${weekday(date)} ${formatDayMonth(date)}`;
}
