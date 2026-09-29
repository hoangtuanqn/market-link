import { isAxiosError } from 'axios';
import { MediaError } from './media';

export type SendErrorKey =
  | 'chat.closed'
  | 'chat.tooFast'
  | 'chat.mediaTooBig'
  | 'chat.mediaTooBigForServer'
  | 'chat.mediaType'
  | 'chat.mediaFailed'
  | 'chat.convertFailed'
  | 'chat.sendFailed';

export function sendErrorKey(error: unknown, what: 'text' | 'media'): SendErrorKey {
  if (error instanceof MediaError) {
    if (error.reason === 'size') return 'chat.mediaTooBig';
    if (error.reason === 'type') return 'chat.mediaType';
    return 'chat.convertFailed';
  }
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status === 409) return 'chat.closed';
  if (status === 429) return 'chat.tooFast';
  if (what === 'media' && status === 413) return 'chat.mediaTooBigForServer';
  if (what === 'media' && status === 415) return 'chat.mediaType';
  return what === 'media' ? 'chat.mediaFailed' : 'chat.sendFailed';
}
