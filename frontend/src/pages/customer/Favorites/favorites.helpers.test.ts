import { describe, expect, it } from 'vitest';
import type { FavoriteDto } from '@/api-requests/favorite.requests';
import { settledRows } from './favorites.helpers';

const fav = (id: number, title: string): FavoriteDto => ({
  id,
  targetType: 'farmer',
  targetId: id,
  title,
  subtitle: null,
  imageUrl: null,
  available: true,
});

describe('settledRows', () => {
  it('pairs every favourite with its fulfilled detail, in order', () => {
    const favs = [fav(1, 'A'), fav(2, 'B')];
    const results: PromiseSettledResult<string>[] = [
      { status: 'fulfilled', value: 'detail-A' },
      { status: 'fulfilled', value: 'detail-B' },
    ];

    expect(settledRows(favs, results)).toEqual([
      { fav: favs[0], detail: 'detail-A' },
      { fav: favs[1], detail: 'detail-B' },
    ]);
  });

  it('falls back to a null detail for a rejected fetch, without dropping the other rows', () => {
    const favs = [fav(1, 'A'), fav(2, 'B'), fav(3, 'C')];
    const results: PromiseSettledResult<string>[] = [
      { status: 'fulfilled', value: 'detail-A' },
      { status: 'rejected', reason: new Error('stall suspended (404)') },
      { status: 'fulfilled', value: 'detail-C' },
    ];

    expect(settledRows(favs, results)).toEqual([
      { fav: favs[0], detail: 'detail-A' },
      { fav: favs[1], detail: null },
      { fav: favs[2], detail: 'detail-C' },
    ]);
  });
});
