import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import CatalogApi from '@/api-requests/catalog.requests';
import DayChips from '@/components/DayChips';
import DirectionsButton from '@/components/DirectionsButton';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import ProductCard from '@/components/ProductCard';
import StallCard from '@/components/StallCard';
import { ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { LoadError } from '@/components/ui/data-state';
import { categories as CATEGORIES, farmers, products } from '@/data/catalog';
import useRequest from '@/hooks/useRequest';
import { dayList, dayName, formatClock, formatDayMonth } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

/** The demo market week, Thursday 24 to Sunday 27 September 2026. */
const DAY_OPTIONS = [
  { value: 4, date: new Date(2026, 8, 24) },
  { value: 5, date: new Date(2026, 8, 25) },
  { value: 6, date: new Date(2026, 8, 26) },
  { value: 0, date: new Date(2026, 8, 27) },
];
/** How the demo data spells a stall's selling days ("Sat, Sun"); used to match, never shown. */
const DOW_ABBR: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

/** FR-010 FR-011 — one market: who sells there on a given day, and what they have. */
const MarketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('MarketDetail');
  const { t: tc } = useTranslation();
  const navigate = useNavigate();

  const marketId = Number(id);
  const validId = Number.isInteger(marketId) && marketId > 0;
  const { state: load, retry } = useRequest(`market:${id}`, () =>
    validId ? CatalogApi.getMarket(marketId).then((result) => result.market) : Promise.reject(new Error('missing')),
  );
  /** The server's 404, or an id that could never be one — the "not here any more" page, not the error block. */
  const missing = load.kind === 'error' && (!validId || Helper.getErrorCode(load.error) === 'MARKET_NOT_FOUND');
  const market = load.kind === 'ready' ? load.data : undefined;

  const [day, setDay] = useState(6);
  const [category, setCategory] = useState('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  // Saved markets arrive with favorites (C7); until then the chip only remembers the click.
  const [saved, setSaved] = useState(false);
  const [scope, setScope] = useState<'product' | 'farmer'>('product');
  const [query, setQuery] = useState('');

  const stallsToday = useMemo(() => {
    if (!market) return [];
    const abbr = DOW_ABBR[day];
    return farmers.filter(
      (f) => f.approval === 'approved' && f.markets.includes(market.id) && f.days.split(', ').includes(abbr),
    );
  }, [market, day]);

  const productsToday = useMemo(() => {
    const stallIds = new Set(stallsToday.map((f) => f.id));
    return products.filter((p) => p.farmerId != null && stallIds.has(p.farmerId));
  }, [stallsToday]);

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

  const shownProducts = productsToday.filter((p) => {
    if (category !== 'All' && p.category !== category) return false;
    if (inStockOnly && (p.status !== 'available' || p.stock === 0)) return false;
    return true;
  });

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
  const dayDate = DAY_OPTIONS.find((d) => d.value === day)?.date;

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?${new URLSearchParams({ scope, q: query.trim() })}`);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">
            {dayLong} {dayDate && formatDayMonth(dayDate)} · {formatClock(market.open)}–{formatClock(market.close)}
          </p>
          <h1 className="text-h1">{market.name}</h1>
          <p className="text-body-lg max-w-155">{t('intro', { count: market.stalls })}</p>
          <p className="text-small text-ink-muted">
            {market.address} · {dayList(market.days)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip
            pressed={saved}
            onClick={() => {
              setSaved((v) => !v);
              Notification.success({
                text: saved ? t('toast.removed', { name: market.name }) : t('toast.saved', { name: market.name }),
              });
            }}
          >
            {saved ? t('save.on') : t('save.off')}
          </Chip>
          <DirectionsButton to={{ lat: market.lat, lng: market.lng }} name={market.name} size="md" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <form
          onSubmit={onSearch}
          role="search"
          className="border-line-strong bg-surface-raised focus-within:outline-focus flex w-full max-w-160 items-stretch overflow-hidden rounded-sm border-[1.5px] focus-within:outline-2 focus-within:outline-offset-1"
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
          <button type="submit" className="bg-brand text-on-brand min-h-11 cursor-pointer px-4 font-bold">
            {t('search.submit')}
          </button>
        </form>

        <div className="flex flex-wrap items-start gap-6">
          <DayChips
            legend={t('day')}
            name="market-day"
            value={String(day)}
            onChange={(v) => setDay(Number(v))}
            options={DAY_OPTIONS.map((d) => ({
              value: String(d.value),
              label: dayName(d.value, 'long'),
              date: formatDayMonth(d.date),
            }))}
          />
          <div className="flex flex-wrap gap-2">
            <Chip pressed={category === 'All'} onClick={() => setCategory('All')}>
              {t('all')}
            </Chip>
            {CATEGORIES.filter((c) => categoryCounts.has(c.name)).map((c) => (
              <Chip key={c.id} pressed={category === c.name} onClick={() => setCategory(c.name)}>
                {c.name} <span className="text-[12px] tabular-nums opacity-80">{categoryCounts.get(c.name)}</span>
              </Chip>
            ))}
            <Chip pressed={inStockOnly} onClick={() => setInStockOnly((v) => !v)}>
              {t('inStock')}
            </Chip>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2">{t('available', { day: dayLong })}</h2>
            <span className="text-small text-ink-muted">
              {t('productsFrom', {
                products: t('products', { count: shownProducts.length }),
                stalls: t('stalls', { count: stallsToday.length }),
              })}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2">
            {shownProducts.map((p) => (
              <ProductCard key={p.id} product={p} showMarket={false} />
            ))}
          </div>
        </div>

        <div className="sticky top-20 flex flex-col gap-4">
          <MarketMap label={t('mapLabel', { name: market.name })} markers={mapMarkers} className="min-h-72" />
          {stallsToday[0] && <StallCard farmer={stallsToday[0]} />}
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-h2">{t('stallsTitle', { day: dayLong })}</h2>
          <span className="text-small text-ink-muted">{t('stallsNote')}</span>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stallsToday.map((f) => (
            <StallCard key={f.id} farmer={f} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default MarketDetailPage;
