import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { sendErrorKey } from './errors';

const http = (status: number) =>
  new AxiosError('x', 'ERR', undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  });

describe('sendErrorKey', () => {
  /** Review Focus #6: stall bị đình chỉ (D-09) — thread đọc được nhưng không gửi được. */
  it('says the stall is not taking messages on 409', () => {
    expect(sendErrorKey(http(409), 'text')).toBe('chat.closed');
  });

  it('asks to slow down on 429', () => {
    expect(sendErrorKey(http(429), 'text')).toBe('chat.tooFast');
  });

  it('names the photo problem on 413 and 415', () => {
    expect(sendErrorKey(http(413), 'photo')).toBe('chat.photoTooBig');
    expect(sendErrorKey(http(415), 'photo')).toBe('chat.photoType');
  });

  it('falls back to the plain message for anything else', () => {
    expect(sendErrorKey(new Error('network'), 'text')).toBe('chat.sendFailed');
    expect(sendErrorKey(new Error('network'), 'photo')).toBe('chat.photoFailed');
  });
});
