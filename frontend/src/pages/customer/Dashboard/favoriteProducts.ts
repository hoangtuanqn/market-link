import { isAxiosError } from 'axios';

const gone = (reason: unknown) => isAxiosError(reason) && reason.response?.status === 404;

export function settledProducts<T>(results: PromiseSettledResult<T>[]): T[] {
  const found = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  const failure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected' && !gone(r.reason));
  if (!found.length && failure) throw failure.reason;
  return found;
}
