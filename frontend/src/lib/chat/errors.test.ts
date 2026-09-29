import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { sendErrorKey } from './errors';
import { MediaError } from './media';

const http = (status: number) =>
  new AxiosError('x', 'ERR', undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  });

describe('sendErrorKey', () => {
  it('says the stall is not taking messages on 409', () => {
    expect(sendErrorKey(http(409), 'text')).toBe('chat.closed');
  });

  it('asks to slow down on 429', () => {
    expect(sendErrorKey(http(429), 'text')).toBe('chat.tooFast');
  });

  it('names the file problem on 413 and 415 without claiming a size the server did not use', () => {
    expect(sendErrorKey(http(413), 'media')).toBe('chat.mediaTooBigForServer');
    expect(sendErrorKey(http(415), 'media')).toBe('chat.mediaType');
  });

  it('names the problem the browser found before uploading', () => {
    expect(sendErrorKey(new MediaError('size'), 'media')).toBe('chat.mediaTooBig');
    expect(sendErrorKey(new MediaError('type'), 'media')).toBe('chat.mediaType');
    expect(sendErrorKey(new MediaError('convert'), 'media')).toBe('chat.convertFailed');
  });

  it('falls back to the plain message for anything else', () => {
    expect(sendErrorKey(new Error('network'), 'text')).toBe('chat.sendFailed');
    expect(sendErrorKey(new Error('network'), 'media')).toBe('chat.mediaFailed');
  });
});
