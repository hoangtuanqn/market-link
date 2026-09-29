import { useCallback, useEffect, useRef, useState } from 'react';

export type RequestState<T> = { kind: 'loading' } | { kind: 'error'; error: unknown } | { kind: 'ready'; data: T };

type Settled<T> = { key: string; state: RequestState<T> };

export default function useRequest<T>(key: string, fetcher: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const fullKey = `${key}#${attempt}`;

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

  const state: RequestState<T> = settled?.key === fullKey ? settled.state : { kind: 'loading' };
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

  return { state, retry, mutate };
}
