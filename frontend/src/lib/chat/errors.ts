import { isAxiosError } from 'axios';

/** Key có thật trong `common.json`: `t()` của i18next chỉ nhận key đã khai, không nhận `string` tuỳ ý. */
export type SendErrorKey =
  'chat.closed' | 'chat.tooFast' | 'chat.photoTooBig' | 'chat.photoType' | 'chat.photoFailed' | 'chat.sendFailed';

/** Lỗi gửi → key i18n dưới `chat.` nói đúng lý do (spec §6.3). */
export function sendErrorKey(error: unknown, what: 'text' | 'photo'): SendErrorKey {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status === 409) return 'chat.closed';
  if (status === 429) return 'chat.tooFast';
  if (what === 'photo' && status === 413) return 'chat.photoTooBig';
  if (what === 'photo' && status === 415) return 'chat.photoType';
  return what === 'photo' ? 'chat.photoFailed' : 'chat.sendFailed';
}
