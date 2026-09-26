import { formatDayMonth, formatTime } from '@/lib/format';

/**
 * Mốc thời gian ngắn của chat: hôm nay thì hiện giờ, cũ hơn thì hiện ngày — cùng quy ước với danh sách đơn. Dùng cho
 * danh sách thread và "Last seen", để "11:47" không bao giờ có nghĩa là ba ngày trước.
 */
export function chatWhen(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const at = new Date(iso);
  return now.toDateString() === at.toDateString() ? formatTime(at) : formatDayMonth(at);
}
