import { isAxiosError } from 'axios';
import { MediaError } from './media';

/** A real key in `common.json`: i18next's `t()` only accepts a declared key, not an arbitrary `string`. */
export type SendErrorKey =
  | 'chat.closed'
  | 'chat.tooFast'
  | 'chat.mediaTooBig'
  | 'chat.mediaType'
  | 'chat.mediaFailed'
  | 'chat.convertFailed'
  | 'chat.sendFailed';

/**
 * A send failure → an i18n key under `chat.` that says the exact reason (spec §6.3). A photo or video refused in the
 * browser (MediaError) gets the same words as the server's 413/415, so the reason reads the same either way.
 */
export function sendErrorKey(error: unknown, what: 'text' | 'media'): SendErrorKey {
  if (error instanceof MediaError) {
    if (error.reason === 'size') return 'chat.mediaTooBig';
    if (error.reason === 'type') return 'chat.mediaType';
    return 'chat.convertFailed';
  }
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status === 409) return 'chat.closed';
  if (status === 429) return 'chat.tooFast';
  if (what === 'media' && status === 413) return 'chat.mediaTooBig';
  if (what === 'media' && status === 415) return 'chat.mediaType';
  return what === 'media' ? 'chat.mediaFailed' : 'chat.sendFailed';
}
