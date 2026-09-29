import { formatDayMonth, formatTime } from '@/lib/format';

export function chatWhen(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const at = new Date(iso);
  return now.toDateString() === at.toDateString() ? formatTime(at) : formatDayMonth(at);
}
