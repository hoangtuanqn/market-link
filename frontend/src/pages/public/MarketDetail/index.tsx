import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import CatalogApi from '@/api-requests/catalog.requests';
import FavoriteApi, { type FavoriteDto } from '@/api-requests/favorite.requests';
import ProductApi from '@/api-requests/product.requests';
import StallApi, { toStallCard, type StallCardData } from '@/api-requests/stall.requests';
import DayChips from '@/components/DayChips';
import DirectionsButton from '@/components/DirectionsButton';
import FavoriteButton from '@/components/FavoriteButton';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import MarketCarousel from '@/components/MarketCarousel';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import ProductCard from '@/components/ProductCard';
import StallCard from '@/components/StallCard';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import useSession from '@/hooks/useSession';
import { dayList, dayName, firstOpenDay, formatClock, formatDayMonth, matchesQuery, nextSevenDays } from '@/lib/format';
import type { ProductType } from '@/types/product.types';
import Helper from '@/utils/helper';

const NO_PRODUCTS: ProductType[] = [];
const NO_FAVORITES: FavoriteDto[] = [];

/** FR-010 FR-011 — one market: who sells there on a given day, and what they have. */
const MarketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('MarketDetail');
  const { t: tc } = useTranslation();
  const { isLoggedIn } = useSession();

  const marketId = Number(id);
  const validId = Number.isInteger(marketId) && marketId > 0;
  const { state: load, retry } = useRequest(`market:${id}`, () =>
    validId ? CatalogApi.getMarket(marketId).then((result) => result.market) : Promise.reject(new Error('missing')),
  );
  /** The server's 404, or an id that could never be one — the "not here any more" page, not the error block. */
  const missing = load.kind === 'error' && (!validId || Helper.getErrorCode(load.error) === 'MARKET_NOT_FOUND');
  const market = load.kind === 'ready' ? load.data : undefined;

  // FR-040 — whether this market is already a favourite of the signed-in customer.
  const { state: favLoad } = useRequest(`fav-market:${marketId}`, () =>
    isLoggedIn ? FavoriteApi.list('market') : Promise.resolve(NO_FAVORITES),
  );
  const favoriteId = favLoad.kind === 'ready' ? (favLoad.data.find((f) => f.targetId === marketId)?.id ?? null) : null;

  // The coming week from today (FR-010); a day the market does not open on is struck through. Until the visitor picks
  // a chip, the day is the first one from today that the market opens on.
  const [week] = useState(() => nextSevenDays());
  // A pick belongs to the market it was made on, so moving to another market starts again from its first open day.
  const [picked, setPicked] = useState<{ market: string | undefined; dow: number } | null>(null);
  const pickedDay = picked && picked.market === id ? picked.dow : null;
  const day = pickedDay ?? (market ? firstOpenDay((d) => market.days.includes(d), week[0].date) : week[0].dow);
  /** No request goes out for a day before the market's own days are known, so a closed day is never fetched. */
  const dayKey = market ? String(day) : 'pending';
  const [category, setCategory] = useState('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [scope, setScope] = useState<'product' | 'farmer'>('product');
  const [query, setQuery] = useState('');

  // FR-010: who is selling here on the chosen day, straight from the API. Keyed by market and day, so a new
  // chip or a new id starts a new request; while the market itself is still loading, this waits.
  const { state: stallsLoad, retry: retryStalls } = useRequest(`market-stalls:${id}:${dayKey}`, () =>
    validId && market ? StallApi.atMarket(marketId, day) : Promise.resolve([]),
  );
  const stallsToday = useMemo<StallCardData[]>(
    () =>
      market && stallsLoad.kind === 'ready' ? stallsLoad.data.map((s) => toStallCard(s, market.id, market.name)) : [],
    [market, stallsLoad],
  );

  // What is on sale here on the chosen day (FR-020), from the same filters the products page uses.
  const { state: productsLoad } = useRequest(`market-products:${id}:${dayKey}`, () =>
    validId && market
      ? ProductApi.list({ marketId, day, pageSize: 50 }).then((r) => r.items)
      : Promise.resolve(NO_PRODUCTS),
  );
  const productsToday: ProductType[] = productsLoad.kind === 'ready' ? productsLoad.data : NO_PRODUCTS;

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    productsToday.forEach((p) => counts.set(p.category, (counts.get(p.category) ?? 0) + 1));
    return counts;
  }, [productsToday]);

  // The market itself plus every stall trading today that has pinned its spot (FR-012).
  const mapMarkers = useMemo<MapMarker[]>(() => {
    if (!market) return [];
    const pins: MapMarker[] = [
      {
        lat: market.lat,
        lng: market.lng,
        kind: 'market',
        label: market.name,
        selected: true,
        popup: {
          title: market.name,
          lines: [`${formatClock(market.open)}\u2013${formatClock(market.close)}`, market.address],
        },
      },
    ];
    stallsToday.forEach((f) => {
      if (f.lat == null || f.lng == null) return;
      pins.push({
        lat: f.lat,
        lng: f.lng,
        kind: 'stall',
        label: f.stall,
        popup: {
          title: f.stall,
          lines: [tc('map.stallPickup', { code: f.stallCode, pickup: f.pickup })],
          href: `/stalls/${f.id}`,
        },
      });
    });
    return pins;
  }, [market, stallsToday, tc]);

  // FR-010 FR-021 — the search box narrows the lists already loaded for this market and day, in place: products by
  // name, or stalls by stall or Farmer name, whichever the scope says. Clearing it brings the full lists back.
  const searching = query.trim() !== '';
  const shownProducts = productsToday.filter((p) => {
    if (category !== 'All' && p.category !== category) return false;
    if (inStockOnly && (p.status !== 'available' || p.stock === 0)) return false;
    if (scope === 'product' && !matchesQuery(query, p.name)) return false;
    return true;
  });
  const shownStalls =
    scope === 'farmer' ? stallsToday.filter((f) => matchesQuery(query, f.stall, f.person)) : stallsToday;
  const productsRef = useRef<HTMLDivElement>(null);
  const stallsRef = useRef<HTMLElement>(null);

  // Hook, so it has to run before either early return below — it stays unconditional even though
  // the fallback photos only matter once `market` is loaded.
  const marketImages = useMemo(() => {
    if (market?.images && market.images.length > 0) return market.images;
    return [
      '/images/markets/market-1.jpg',
      '/images/markets/market-2.jpg',
      '/images/markets/market-3.jpg',
      '/images/markets/market-4.jpg',
      '/images/markets/market-5.jpg',
    ];
  }, [market]);

  if (load.kind === 'loading') {
    return (
      <div className="flex flex-col gap-8">
        <MarketCardSkeleton count={1} />
      </div>
    );
  }

  if (load.kind === 'error' && !missing) {
    return <LoadError noun={t('error.noun')} onRetry={retry} />;
  }

  if (!market) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('notFound.title')}</h1>
        <ButtonLink to="/markets">{t('notFound.browse')}</ButtonLink>
      </div>
    );
  }

  const dayLong = dayName(day, 'long');
  const dayDate = week.find((d) => d.dow === day)?.date;

  // The lists filter as you type; submitting brings the list being searched into view (the stalls sit below the map).
  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    (scope === 'product' ? productsRef : stallsRef).current?.scrollIntoView({
      block: 'start',
      behavior: still ? 'auto' : 'smooth',
    });
  };
  const searchEmpty = (title: string) => (
    <DataState
      title={title}
      text={t('searchEmpty.text', { day: dayLong })}
      action={
        <Button variant="secondary" size="sm" onClick={() => setQuery('')}>
          {t('searchEmpty.clear')}
        </Button>
      }
    />
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Top Market Photos Carousel */}
      <MarketCarousel images={marketImages} marketName={market.name} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">
            {dayLong} {dayDate && formatDayMonth(dayDate)} · {formatClock(market.open)}–{formatClock(market.close)}
          </p>
          <h1 className="font-hand md:text-display text-h1">{market.name}</h1>
          <p className="text-body-lg max-w-155">{t('intro', { count: market.stalls })}</p>
          <p className="text-small text-ink-muted">
            {market.address} · {dayList(market.days)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FavoriteButton
            key={favoriteId ?? 'none'}
            targetType="market"
            targetId={market.id}
            favoriteId={favoriteId}
            labelOff={t('save.off')}
            labelOn={t('save.on')}
          />
          <DirectionsButton to={{ lat: market.lat, lng: market.lng }} name={market.name} size="md" />
        </div>
      </div>

      {/* Filter and Search Section */}
      <Card as="section" aria-label="Filters" className="flex flex-col gap-4 p-5">
        <form
          onSubmit={onSearch}
          role="search"
          className="border-line-strong bg-surface-raised focus-within:outline-focus flex w-full max-w-xl items-stretch overflow-hidden rounded-sm border-[1.5px] focus-within:outline-2 focus-within:outline-offset-1"
        >
          <label className="sr-only" htmlFor="m-scope">
            {t('search.scope')}
          </label>
          <select
            id="m-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as 'product' | 'farmer')}
            className="border-line-strong bg-surface-sunken text-small text-ink min-h-11 border-r-[1.5px] px-3 font-bold focus:outline-none"
          >
            <option value="product">{t('search.scopes.product')}</option>
            <option value="farmer">{t('search.scopes.farmer')}</option>
          </select>
          <label className="sr-only" htmlFor="m-q">
            {t('search.keyword')}
          </label>
          <input
            id="m-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="text-body text-ink placeholder:text-ink-muted min-h-11 min-w-0 flex-1 bg-transparent px-3 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-brand text-on-brand min-h-11 cursor-pointer px-5 font-bold transition-opacity hover:opacity-90"
          >
            {t('search.submit')}
          </button>
        </form>

        <div className="border-line border-t" />

        <div className="flex flex-col gap-2">
          <DayChips
            legend={t('day')}
            name="market-day"
            value={String(day)}
            onChange={(v) => setPicked({ market: id, dow: Number(v) })}
            options={week.map((d) => ({
              value: String(d.dow),
              label: dayName(d.dow, 'long'),
              date: formatDayMonth(d.date),
              disabled: !market.days.includes(d.dow),
            }))}
          />
        </div>

        <div className="border-line flex flex-col gap-2 border-t pt-3">
          <span className="text-small text-ink font-bold">{tc('category', { defaultValue: 'Category' })}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Chip pressed={category === 'All'} onClick={() => setCategory('All')}>
              {t('all')}
            </Chip>
            {[...categoryCounts.keys()].sort().map((name) => (
              <Chip key={name} pressed={category === name} onClick={() => setCategory(name)}>
                {name} <span className="text-[12px] tabular-nums opacity-80">{categoryCounts.get(name)}</span>
              </Chip>
            ))}
            <div className="bg-line-strong mx-1 h-5 w-px self-center" aria-hidden="true" />
            <Chip pressed={inStockOnly} onClick={() => setInStockOnly((v) => !v)}>
              {t('inStock')}
            </Chip>
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div ref={productsRef} className="flex scroll-mt-20 flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2">{t('available', { day: dayLong })}</h2>
            <span className="text-small text-ink-muted">
              {t('productsFrom', {
                products: t('products', { count: shownProducts.length }),
                stalls: t('stalls', { count: shownStalls.length }),
              })}
            </span>
          </div>
          {shownProducts.length ? (
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2">
              {shownProducts.map((p) => (
                <ProductCard key={p.id} product={p} showMarket={false} />
              ))}
            </div>
          ) : productsLoad.kind !== 'ready' ? null : searching && scope === 'product' ? (
            searchEmpty(t('searchEmpty.products', { q: query.trim() }))
          ) : (
            <DataState title={t('productsEmpty.title', { day: dayLong })} text={t('productsEmpty.text')} />
          )}
        </div>

        <div className="sticky top-20 flex flex-col gap-4">
          <MarketMap
            label={t('mapLabel', { name: market.name })}
            markers={mapMarkers}
            className="min-h-80 md:min-h-120"
          />
          <p className="text-caption text-ink-muted">{t('stallsNote')}</p>
        </div>
      </div>

      <section ref={stallsRef} className="flex scroll-mt-20 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-h2">{t('stallsTitle', { day: dayLong })}</h2>
          <span className="text-small text-ink-muted">{t('stallsNote')}</span>
        </div>
        {stallsLoad.kind === 'loading' ? (
          <MarketCardSkeleton count={2} />
        ) : stallsLoad.kind === 'error' ? (
          <LoadError noun={t('stallsNoun')} onRetry={retryStalls} />
        ) : shownStalls.length ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {shownStalls.map((f) => (
              <StallCard key={f.id} farmer={f} />
            ))}
          </div>
        ) : stallsToday.length ? (
          searchEmpty(t('searchEmpty.stalls', { q: query.trim() }))
        ) : (
          <DataState title={t('stallsEmpty.title', { day: dayLong })} text={t('stallsNote')} />
        )}
      </section>
    </div>
  );
};

export default MarketDetailPage;
