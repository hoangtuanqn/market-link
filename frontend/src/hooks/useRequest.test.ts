import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import useRequest from './useRequest';

/** A promise the test resolves by hand, so the gap between two keys can be observed. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe('useRequest', () => {
  it('shows loading again when the key changes by default', async () => {
    const second = deferred<string>();
    const { result, rerender } = renderHook(
      ({ k }) => useRequest(k, () => (k === 'a' ? Promise.resolve('A') : second.promise)),
      {
        initialProps: { k: 'a' },
      },
    );
    await waitFor(() => expect(result.current.state).toEqual({ kind: 'ready', data: 'A' }));

    rerender({ k: 'b' });
    expect(result.current.state.kind).toBe('loading');
    expect(result.current.refreshing).toBe(false);
  });

  it('keeps the last data while the next key loads when keepPrevious is on', async () => {
    const second = deferred<string>();
    const { result, rerender } = renderHook(
      ({ k }) => useRequest(k, () => (k === 'a' ? Promise.resolve('A') : second.promise), { keepPrevious: true }),
      { initialProps: { k: 'a' } },
    );
    await waitFor(() => expect(result.current.state).toEqual({ kind: 'ready', data: 'A' }));

    rerender({ k: 'b' });
    expect(result.current.state).toEqual({ kind: 'ready', data: 'A' });
    expect(result.current.refreshing).toBe(true);

    await act(async () => second.resolve('B'));
    expect(result.current.state).toEqual({ kind: 'ready', data: 'B' });
    expect(result.current.refreshing).toBe(false);
  });
});
