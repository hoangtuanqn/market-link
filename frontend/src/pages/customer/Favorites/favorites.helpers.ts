import type { FavoriteDto } from '@/api-requests/favorite.requests';

/**
 * Pairs each favourite with its settled detail fetch (`Promise.allSettled`), in the same order as `favs`. A rejected
 * detail — a suspended stall or a removed market answering 404, for instance — does not drop the whole tab: that row
 * gets `detail: null` so the caller can fall back to the favourite's own `title`/`subtitle` and Remove still works.
 */
export function settledRows<T>(
  favs: FavoriteDto[],
  results: PromiseSettledResult<T>[],
): Array<{ fav: FavoriteDto; detail: T | null }> {
  return favs.map((fav, i) => {
    const result = results[i];
    return { fav, detail: result?.status === 'fulfilled' ? result.value : null };
  });
}
