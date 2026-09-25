import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import ProductCard from '@/components/ProductCard';
import StallCard from '@/components/StallCard';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import Tabs from '@/components/ui/tabs';
import { farmer, farmers, products } from '@/data/catalog';
import { markets } from '@/data/home';

const DAY_OPTIONS = [
  { value: 4, label: 'Thu', sub: '24/09' },
  { value: 5, label: 'Fri', sub: '25/09' },
  { value: 6, label: 'Sat', sub: '26/09' },
  { value: 0, label: 'Sun', sub: '27/09' },
];
const SORTS = ['Best match', 'Nearest', 'Price', 'Rating'] as const;

/** FR-023 — search across markets, stalls and products at once, with results on a map. */
const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const scopeParam = searchParams.get('scope') ?? 'all';
  const q = searchParams.get('q') ?? '';

  const [draftScope, setDraftScope] = useState(scopeParam);
  const [draftQ, setDraftQ] = useState(q);
  const [day, setDay] = useState(6);
  const [sort, setSort] = useState<(typeof SORTS)[number]>('Best match');
  const [tab, setTab] = useState<'all' | 'market' | 'farmer' | 'product'>('all');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearchParams({ scope: draftScope, q: draftQ.trim() });
  };

  const openMarketIds = useMemo(() => new Set(markets.filter((m) => m.days.includes(day)).map((m) => m.id)), [day]);

  const results = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    const matches = (text: string) => qLower !== '' && text.toLowerCase().includes(qLower);

    let matchedProducts = products.filter((p) => matches(p.name) && farmer(p.farmerId!)?.approval === 'approved');
    let matchedFarmers = farmers.filter(
      (f) => f.approval === 'approved' && (matches(f.stall) || matchedProducts.some((p) => p.farmerId === f.id)),
    );
    let matchedMarkets = markets.filter((m) => matches(m.name));

    // Only what's open/selling on the chosen day.
    matchedMarkets = matchedMarkets.filter((m) => openMarketIds.has(m.id));
    matchedFarmers = matchedFarmers.filter((f) => f.markets.some((id) => openMarketIds.has(id)));
    matchedProducts = matchedProducts.filter((p) => farmer(p.farmerId!)?.markets.some((id) => openMarketIds.has(id)));

    if (sort === 'Price') matchedProducts = [...matchedProducts].sort((a, b) => a.price - b.price);
    if (sort === 'Rating') matchedFarmers = [...matchedFarmers].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sort === 'Nearest') {
      matchedFarmers = [...matchedFarmers].sort(
        (a, b) => parseFloat(a.distance ?? '0') - parseFloat(b.distance ?? '0'),
      );
      matchedMarkets = [...matchedMarkets].sort(
        (a, b) => parseFloat(a.distance ?? '0') - parseFloat(b.distance ?? '0'),
      );
    }

    return { markets: matchedMarkets, farmers: matchedFarmers, products: matchedProducts };
  }, [q, openMarketIds, sort]);

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
        lines: [`${m.open}\u2013${m.close}`, m.district],
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
          lines: [`Stall ${f.stallCode} \u00b7 pickup ${f.pickup}`],
          href: `/stalls/${f.id}`,
        },
      });
    });
    return pins;
  }, [results]);
  const dayLabel = DAY_OPTIONS.find((d) => d.value === day)?.label ?? '';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-h1">Search</h1>
        <form
          key={`${scopeParam}:${q}`}
          onSubmit={onSubmit}
          role="search"
          className="border-line-strong bg-surface-raised focus-within:outline-focus flex w-full max-w-160 items-stretch overflow-hidden rounded-sm border-[1.5px] focus-within:outline-2 focus-within:outline-offset-1"
        >
          <label className="sr-only" htmlFor="q-scope">
            Search in
          </label>
          <select
            id="q-scope"
            value={draftScope}
            onChange={(e) => setDraftScope(e.target.value)}
            className="border-line-strong bg-surface-sunken text-small text-ink min-h-11 border-r-[1.5px] px-3 font-bold focus:outline-none"
          >
            <option value="all">Everything</option>
            <option value="market">Markets</option>
            <option value="farmer">Stalls</option>
            <option value="product">Products</option>
          </select>
          <label className="sr-only" htmlFor="q">
            Keyword
          </label>
          <input
            id="q"
            type="search"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            className="text-body text-ink min-h-11 min-w-0 flex-1 bg-transparent px-3 focus:outline-none"
          />
          <button type="submit" className="bg-brand text-on-brand min-h-11 cursor-pointer px-4 font-bold">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-start gap-6">
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="text-small mb-2 p-0 font-bold">Market day</legend>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((d) => (
                <label key={d.value} className="relative">
                  <input
                    type="radio"
                    name="day"
                    checked={day === d.value}
                    onChange={() => setDay(d.value)}
                    className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
                  />
                  <span className="border-line-strong bg-surface-raised peer-checked:bg-brand peer-checked:text-on-brand flex min-h-11 min-w-14 flex-col items-center justify-center rounded-full px-2.5 py-1 text-[14px] font-bold shadow-[inset_0_0_0_1.5px_var(--line-strong)] peer-checked:shadow-none">
                    {d.label}
                    <small className="text-ink-muted text-[12px] font-normal peer-checked:text-inherit">{d.sub}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-2">
            <span className="text-small font-bold">Sort</span>
            <div className="flex flex-wrap gap-2">
              {SORTS.map((s) => (
                <Chip key={s} pressed={sort === s} onClick={() => setSort(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Tabs
        label="Result type"
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'all', label: 'All', count: total },
          { id: 'market', label: 'Markets', count: results.markets.length },
          { id: 'farmer', label: 'Stalls', count: results.farmers.length },
          { id: 'product', label: 'Products', count: results.products.length },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          {q.trim() === '' ? (
            <DataState title="Type something to search" text="Try a product name, a market, or a stall." />
          ) : total === 0 ? (
            <DataState
              title="Nothing matched"
              text="Try a shorter word, or drop a filter. Searching looks at markets, stalls and products at once."
            />
          ) : (
            <>
              <p className="text-small text-ink-muted">
                {total} results for &ldquo;{q}&rdquo; on {dayLabel}
              </p>

              {(tab === 'all' || tab === 'farmer') && (
                <section className="flex flex-col gap-4">
                  <h2 className="text-h3">Stalls</h2>
                  {results.farmers.length ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {results.farmers.map((f) => (
                        <StallCard key={f.id} farmer={f} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-small text-ink-muted">No stalls matched.</p>
                  )}
                </section>
              )}

              {(tab === 'all' || tab === 'product') && (
                <section className="flex flex-col gap-4">
                  <h2 className="text-h3">Products</h2>
                  {results.products.length ? (
                    <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2">
                      {results.products.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-small text-ink-muted">No products matched.</p>
                  )}
                </section>
              )}

              {(tab === 'all' || tab === 'market') && (
                <section className="flex flex-col gap-4">
                  <h2 className="text-h3">Markets</h2>
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
                      title={`No market is called "${q}"`}
                      text={`Markets are matched by name and area. ${results.farmers.length} stalls above sell something matching "${q}".`}
                      action={
                        results.farmers.length > 0 && (
                          <Button variant="secondary" size="sm" onClick={() => setTab('farmer')}>
                            Show the stalls
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
          <MarketMap label="Map of results" markers={mapMarkers} className="min-h-72" />
          <p className="text-small text-ink-muted">
            Results with a location are pinned. On phones a &ldquo;List / Map&rdquo; toggle switches between the two.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
