import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import CatalogApi from '@/api-requests/catalog.requests';
import ProductApi from '@/api-requests/product.requests';
import StallApi, { toStallCard, type StallCardData } from '@/api-requests/stall.requests';
import DayChips from '@/components/DayChips';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import ProductCard from '@/components/ProductCard';
import StallCard from '@/components/StallCard';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import Tabs from '@/components/ui/tabs';
import useRequest from '@/hooks/useRequest';
import { dayName, formatClock, formatDayMonth } from '@/lib/format';
import type { MarketType } from '@/types/market.types';
import type { ProductType } from '@/types/product.types';

/** The demo market week, Thursday 24 to Sunday 27 September 2026. */
const DAY_OPTIONS = [
  { value: 4, date: new Date(2026, 8, 24) },
  { value: 5, date: new Date(2026, 8, 25) },
  { value: 6, date: new Date(2026, 8, 26) },
  { value: 0, date: new Date(2026, 8, 27) },
];
const SORTS = ['best', 'nearest', 'price', 'rating'] as const;
const SCOPES = ['all', 'market', 'farmer', 'product'] as const;
const FETCH_SIZE = 50;

type Results = { markets: MarketType[]; farmers: StallCardData[]; products: ProductType[] };
const NO_RESULTS: Results = { markets: [], farmers: [], products: [] };

/** FR-023 — search across markets, stalls and products at once, with results on a map. */
const SearchPage = () => {
  const { t } = useTranslation('Search');
  const { t: tc } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const scopeParam = searchParams.get('scope') ?? 'all';
  const q = searchParams.get('q') ?? '';

  const [draftScope, setDraftScope] = useState(scopeParam);
  const [draftQ, setDraftQ] = useState(q);
  const [day, setDay] = useState(6);
  const [sort, setSort] = useState<(typeof SORTS)[number]>('best');
  const [tab, setTab] = useState<'all' | 'market' | 'farmer' | 'product'>('all');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearchParams({ scope: draftScope, q: draftQ.trim() });
  };

  // One round to the three public lists (contract §3, §4, §5), all filtered by the same keyword and day.
  // "Nearest" needs a location the page does not ask for, so it sorts like "best match" until it does.
  const keyword = q.trim();
  const { state: load, retry } = useRequest(`search:${keyword}:${day}:${sort}`, () =>
    keyword === ''
      ? Promise.resolve(NO_RESULTS)
      : Promise.all([
          CatalogApi.listMarkets({ q: keyword, day, pageSize: FETCH_SIZE }),
          StallApi.list({ q: keyword, day, pageSize: FETCH_SIZE }),
          ProductApi.list({
            q: keyword,
            day,
            pageSize: FETCH_SIZE,
            sort: sort === 'price' ? 'price_asc' : sort === 'rating' ? 'rating' : 'newest',
          }),
        ]).then(([markets, stalls, products]) => ({
          markets: markets.items,
          farmers: stalls.items.map((s) => toStallCard(s, 0, '')),
          products: products.items,
        })),
  );
  const results = load.kind === 'ready' ? load.data : NO_RESULTS;
  const total = results.markets.length + results.farmers.length + results.products.length;

  // FR-023 asks for results on a map. Products have no coordinates of their own, so a product match is
  // represented by the stall selling it, which is the place you would actually travel to.
  const mapMarkers = useMemo<MapMarker[]>(() => {
    const pins: MapMarker[] = results.markets.map((m) => ({
      lat: m.lat,
      lng: m.lng,
      kind: 'market' as const,
      label: m.name,
      popup: {
        title: m.name,
        lines: [`${formatClock(m.open)}–${formatClock(m.close)}`, m.district],
        href: `/markets/${m.id}`,
      },
    }));
    results.farmers.forEach((f) => {
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
  }, [results, tc]);
  const dayLabel = dayName(day, 'long');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-h1">{t('title')}</h1>
        <form
          key={`${scopeParam}:${q}`}
          onSubmit={onSubmit}
          role="search"
          className="border-line-strong bg-surface-raised focus-within:outline-focus flex w-full max-w-160 items-stretch overflow-hidden rounded-sm border-[1.5px] focus-within:outline-2 focus-within:outline-offset-1"
        >
          <label className="sr-only" htmlFor="q-scope">
            {t('search.scope')}
          </label>
          <select
            id="q-scope"
            value={draftScope}
            onChange={(e) => setDraftScope(e.target.value)}
            className="border-line-strong bg-surface-sunken text-small text-ink min-h-11 border-r-[1.5px] px-3 font-bold focus:outline-none"
          >
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {t(`search.scopes.${s}`)}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="q">
            {t('search.keyword')}
          </label>
          <input
            id="q"
            type="search"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            className="text-body text-ink min-h-11 min-w-0 flex-1 bg-transparent px-3 focus:outline-none"
          />
          <button type="submit" className="bg-brand text-on-brand min-h-11 cursor-pointer px-4 font-bold">
            {t('search.submit')}
          </button>
        </form>

        <div className="flex flex-wrap items-start gap-6">
          <DayChips
            legend={t('day')}
            name="day"
            value={String(day)}
            onChange={(v) => setDay(Number(v))}
            options={DAY_OPTIONS.map((d) => ({
              value: String(d.value),
              label: dayName(d.value, 'long'),
              date: formatDayMonth(d.date),
            }))}
          />
          <div className="flex flex-col gap-2">
            <span className="text-small font-bold">{t('sort')}</span>
            <div className="flex flex-wrap gap-2">
              {SORTS.map((s) => (
                <Chip key={s} pressed={sort === s} onClick={() => setSort(s)}>
                  {t(`sorts.${s}`)}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Tabs
        label={t('tabs.label')}
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'all', label: t('tabs.all'), count: total },
          { id: 'market', label: t('tabs.market'), count: results.markets.length },
          { id: 'farmer', label: t('tabs.farmer'), count: results.farmers.length },
          { id: 'product', label: t('tabs.product'), count: results.products.length },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          {keyword === '' ? (
            <DataState title={t('empty.startTitle')} text={t('empty.startText')} />
          ) : load.kind === 'loading' ? (
            <MarketCardSkeleton count={3} />
          ) : load.kind === 'error' ? (
            <LoadError noun={t('error.noun')} onRetry={retry} />
          ) : total === 0 ? (
            <DataState title={t('empty.noneTitle')} text={t('empty.noneText')} />
          ) : (
            <>
              <p className="text-small text-ink-muted">{t('results', { count: total, q, day: dayLabel })}</p>

              {(tab === 'all' || tab === 'farmer') && (
                <section className="flex flex-col gap-4">
                  <h2 className="text-h3">{t('tabs.farmer')}</h2>
                  {results.farmers.length ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {results.farmers.map((f) => (
                        <StallCard key={f.id} farmer={f} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-small text-ink-muted">{t('noStalls')}</p>
                  )}
                </section>
              )}

              {(tab === 'all' || tab === 'product') && (
                <section className="flex flex-col gap-4">
                  <h2 className="text-h3">{t('tabs.product')}</h2>
                  {results.products.length ? (
                    <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2">
                      {results.products.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-small text-ink-muted">{t('noProducts')}</p>
                  )}
                </section>
              )}

              {(tab === 'all' || tab === 'market') && (
                <section className="flex flex-col gap-4">
                  <h2 className="text-h3">{t('tabs.market')}</h2>
                  {results.markets.length ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {results.markets.map((m) => (
                        <Link
                          key={m.id}
                          to={`/markets/${m.id}`}
                          className="border-line-strong bg-surface-raised shadow-tag block rounded-md border-[1.5px] p-4 no-underline"
                        >
                          <b className="text-ink text-[17px]">{m.name}</b>
                          <p className="text-small text-ink-muted mt-1">{m.address}</p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <DataState
                      title={t('noMarket.title', { q })}
                      text={t('noMarket.text', { count: results.farmers.length, q })}
                      action={
                        results.farmers.length > 0 && (
                          <Button variant="secondary" size="sm" onClick={() => setTab('farmer')}>
                            {t('noMarket.showStalls')}
                          </Button>
                        )
                      }
                    />
                  )}
                </section>
              )}
            </>
          )}
        </div>

        <div className="sticky top-20 flex flex-col gap-2">
          <MarketMap label={t('map.label')} markers={mapMarkers} className="min-h-72" />
          <p className="text-small text-ink-muted">{t('map.note')}</p>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
