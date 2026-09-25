import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import DayChips from '@/components/DayChips';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import ProductCard from '@/components/ProductCard';
import StallCard from '@/components/StallCard';
import { ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { categories as CATEGORIES, farmers, products } from '@/data/catalog';
import { markets } from '@/data/home';
import { dayList } from '@/lib/format';
import Notification from '@/utils/notification';
import DirectionsButton from '@/components/DirectionsButton';

const DAY_OPTIONS = [
  { value: 4, label: 'Thu', sub: '24/09' },
  { value: 5, label: 'Fri', sub: '25/09' },
  { value: 6, label: 'Sat', sub: '26/09' },
  { value: 0, label: 'Sun', sub: '27/09' },
];
const DAY_NAME: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};
const DOW_ABBR: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

/** FR-010 FR-011 — one market: who sells there on a given day, and what they have. */
const MarketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const market = markets.find((m) => m.id === Number(id));

  const [day, setDay] = useState(6);
  const [category, setCategory] = useState('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [saved, setSaved] = useState(market?.saved ?? false);
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
        popup: { title: market.name, lines: [`${market.open}\u2013${market.close}`, market.address] },
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
          lines: [`Stall ${f.stallCode} \u00b7 pickup ${f.pickup}`],
          href: `/stalls/${f.id}`,
        },
      });
    });
    return pins;
  }, [market, stallsToday]);

  const shownProducts = productsToday.filter((p) => {
    if (category !== 'All' && p.category !== category) return false;
    if (inStockOnly && (p.status !== 'available' || p.stock === 0)) return false;
    return true;
  });

  if (!market) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">That market is not here any more</h1>
        <ButtonLink to="/markets">Browse markets</ButtonLink>
      </div>
    );
  }

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?${new URLSearchParams({ scope, q: query.trim() })}`);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">
            {DAY_NAME[day]} {DAY_OPTIONS.find((d) => d.value === day)?.sub} · {market.open}–{market.close}
          </p>
          <h1 className="text-h1">{market.name}</h1>
          <p className="text-body-lg max-w-155">
            {market.stalls} stalls. Each stall closes its own orders 12 to 24 hours before pickup. Pick up at the stall
            and pay the Farmer directly.
          </p>
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
                text: saved ? `Removed ${market.name} from favorites.` : `Saved ${market.name}.`,
              });
            }}
          >
            {saved ? 'Saved market' : 'Save market'}
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
            Search in
          </label>
          <select
            id="m-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as 'product' | 'farmer')}
            className="border-line-strong bg-surface-sunken text-small text-ink min-h-11 border-r-[1.5px] px-3 font-bold focus:outline-none"
          >
            <option value="product">Products at this market</option>
            <option value="farmer">Stalls at this market</option>
          </select>
          <label className="sr-only" htmlFor="m-q">
            Keyword
          </label>
          <input
            id="m-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Water spinach, sourdough, eggs…"
            className="text-body text-ink placeholder:text-ink-muted min-h-11 min-w-0 flex-1 bg-transparent px-3 focus:outline-none"
          />
          <button type="submit" className="bg-brand text-on-brand min-h-11 cursor-pointer px-4 font-bold">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-start gap-6">
          <DayChips
            legend="Market day"
            name="market-day"
            value={String(day)}
            onChange={(v) => setDay(Number(v))}
            options={DAY_OPTIONS.map((d) => ({ value: String(d.value), label: d.label, sub: d.sub }))}
          />
          <div className="flex flex-wrap gap-2">
            <Chip pressed={category === 'All'} onClick={() => setCategory('All')}>
              All
            </Chip>
            {CATEGORIES.filter((c) => categoryCounts.has(c.name)).map((c) => (
              <Chip key={c.id} pressed={category === c.name} onClick={() => setCategory(c.name)}>
                {c.name} <span className="text-[12px] tabular-nums opacity-80">{categoryCounts.get(c.name)}</span>
              </Chip>
            ))}
            <Chip pressed={inStockOnly} onClick={() => setInStockOnly((v) => !v)}>
              In stock
            </Chip>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2">Available on {DAY_NAME[day]}</h2>
            <span className="text-small text-ink-muted">
              {shownProducts.length} products from {stallsToday.length} stalls
            </span>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2">
            {shownProducts.map((p) => (
              <ProductCard key={p.id} product={p} showMarket={false} />
            ))}
          </div>
        </div>

        <div className="sticky top-20 flex flex-col gap-4">
          <MarketMap label={`Map of ${market.name} and its stalls`} markers={mapMarkers} className="min-h-72" />
          {stallsToday[0] && <StallCard farmer={stallsToday[0]} />}
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-h2">Stalls at this market on {DAY_NAME[day]}</h2>
          <span className="text-small text-ink-muted">
            Stalls that are not selling on the chosen day are not listed
          </span>
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
