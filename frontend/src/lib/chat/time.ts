import { formatDayMonth, formatTime } from '@/lib/format';

/**
 * The chat's short time marker: today shows the time, older shows the date — same convention as the order list. Used
 * for the thread list and "Last seen", so "11:47" never means three days ago.
 */
export function chatWhen(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const at = new Date(iso);
  return now.toDateString() === at.toDateString() ? formatTime(at) : formatDayMonth(at);
}
