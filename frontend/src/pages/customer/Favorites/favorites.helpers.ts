import type { FavoriteDto } from '@/api-requests/favorite.requests';

export function settledRows<T>(
  favs: FavoriteDto[],
  results: PromiseSettledResult<T>[],
): Array<{ fav: FavoriteDto; detail: T | null }> {
  return favs.map((fav, i) => {
    const result = results[i];
    return { fav, detail: result?.status === 'fulfilled' ? result.value : null };
  });
}
