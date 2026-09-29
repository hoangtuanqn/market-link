import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { settledProducts } from './favoriteProducts';

const httpError = (status: number) =>
  new AxiosError('failed', String(status), undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: null,
  });

describe('settledProducts (FR-040 dashboard favourites)', () => {
  it('leaves out a product that failed and keeps the others in order', () => {
    expect(
      settledProducts([
        { status: 'fulfilled', value: 'a' },
        { status: 'rejected', reason: httpError(404) },
        { status: 'fulfilled', value: 'c' },
      ]),
    ).toEqual(['a', 'c']);
  });

  it('shows nothing, not an error, when every favourite product is gone', () => {
    expect(settledProducts([{ status: 'rejected', reason: httpError(404) }])).toEqual([]);
  });

  it('still fails when nothing loaded because of another error, so the block can offer a retry', () => {
    const offline = new Error('Network Error');
    expect(() => settledProducts([{ status: 'rejected', reason: offline }])).toThrow(offline);
  });
});
