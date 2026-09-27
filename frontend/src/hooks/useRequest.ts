import { useCallback, useEffect, useRef, useState } from 'react';

/** FR-084: what one request is doing. "Empty" is not a request state — each screen derives it from the data. */
export type RequestState<T> = { kind: 'loading' } | { kind: 'error'; error: unknown } | { kind: 'ready'; data: T };

type Settled<T> = { key: string; state: RequestState<T> };

/**
 * One request, keyed by what it is for. Loading is _derived_ — the last settled result belongs to a different key —
 * rather than written into state from inside the effect, which the project's React lint forbids
 * (`react-hooks/set-state-in-effect`). Changing `key` (a new id, a new filter) or calling `retry` starts a fresh
 * request; `mutate` edits the loaded data in place after a save or a delete, so a list need not be fetched again.
 *
 * `keepPrevious` keeps showing the last loaded data while a new key loads, with `refreshing` true in the meantime. Use
 * it where swapping the page for a loading line would jump the scroll position, e.g. the cart re-pricing on every
 * quantity change (QA e2e round 3, #3).
 */
export default function useRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { keepPrevious?: boolean } = {},
) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const fullKey = `${key}#${attempt}`;

  // The latest fetcher without making it a dependency: a new closure each render must not restart the request.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let alive = true;
    fetcherRef
      .current()
      .then((data) => {
        if (alive) setSettled({ key: fullKey, state: { kind: 'ready', data } });
      })
      .catch((error: unknown) => {
        if (alive) setSettled({ key: fullKey, state: { kind: 'error', error } });
      });
    return () => {
      alive = false;
    };
  }, [fullKey]);

  const current = settled?.key === fullKey;
  const state: RequestState<T> = current
    ? settled.state
    : options.keepPrevious && settled?.state.kind === 'ready'
      ? settled.state
      : { kind: 'loading' };
  const refreshing = !current && state.kind === 'ready';
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const mutate = useCallback(
    (update: (data: T) => T) =>
      setSettled((current) =>
        current && current.state.kind === 'ready'
          ? { key: current.key, state: { kind: 'ready', data: update(current.state.data) } }
          : current,
      ),
    [],
  );

  return { state, refreshing, retry, mutate };
}
