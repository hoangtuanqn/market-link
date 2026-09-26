import { isAxiosError } from 'axios';

/** A real key in `common.json`: i18next's `t()` only accepts a declared key, not an arbitrary `string`. */
export type SendErrorKey =
  'chat.closed' | 'chat.tooFast' | 'chat.photoTooBig' | 'chat.photoType' | 'chat.photoFailed' | 'chat.sendFailed';

/** A send failure → an i18n key under `chat.` that says the exact reason (spec §6.3). */
export function sendErrorKey(error: unknown, what: 'text' | 'photo'): SendErrorKey {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status === 409) return 'chat.closed';
  if (status === 429) return 'chat.tooFast';
  if (what === 'photo' && status === 413) return 'chat.photoTooBig';
  if (what === 'photo' && status === 415) return 'chat.photoType';
  return what === 'photo' ? 'chat.photoFailed' : 'chat.sendFailed';
}
