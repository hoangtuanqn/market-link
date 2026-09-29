import { isAxiosError } from 'axios';

const gone = (reason: unknown) => isAxiosError(reason) && reason.response?.status === 404;

/**
 * The dashboard's favourite products from `Promise.allSettled`, in order. A product that failed is left out: one
 * favourite that was deleted or hidden since (404) must not blank the whole block, as `Promise.all` did. Only when
 * nothing loaded and some failure is not a 404 (offline, a 500) is it an error, so the block can say so.
 */
export function settledProducts<T>(results: PromiseSettledResult<T>[]): T[] {
  const found = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  const failure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected' && !gone(r.reason));
  if (!found.length && failure) throw failure.reason;
  return found;
}
