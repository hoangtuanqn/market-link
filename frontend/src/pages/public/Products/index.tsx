import { useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import { SelectField } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import ProductCard from '@/components/ProductCard';
import { categories, farmer, products } from '@/data/catalog';
import { markets } from '@/data/home';
import { vnd } from '@/lib/format';

const PAGE_SIZE = 12;
const DOW = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];
const LOW = 30000;
const HIGH = 80000;
const PRICE_BANDS = [
  { value: 'any', label: 'Any price', test: () => true },
  { value: 'low', label: `Under ${vnd(LOW)}`, test: (p: number) => p < LOW },
  { value: 'mid', label: `${vnd(LOW)} – ${vnd(HIGH)}`, test: (p: number) => p >= LOW && p <= HIGH },
  { value: 'high', label: `Over ${vnd(HIGH)}`, test: (p: number) => p > HIGH },
] as const;
const SORTS = ['Newest', 'Price, low to high', 'Price, high to low', 'Top rated'] as const;

/** Only what an approved stall has actually listed. */
const listed = products.filter((p) => p.farmerId != null && farmer(p.farmerId)?.approval === 'approved');

const sellsOn = (dow: number) => {
  const openMarketIds = new Set(markets.filter((m) => m.days.includes(dow)).map((m) => m.id));
  return listed.some((p) => {
    const f = farmer(p.farmerId!);
    return f?.markets.some((id) => openMarketIds.has(id));
  });
};

/** FR-020 FR-021 — browse products by category, price, market and day. */
const ProductsPage = () => {
  const [day, setDay] = useState(6);
  const [selectedCats, setSelectedCats] = useState<string[]>([categories[0].name]);
  const [priceBand, setPriceBand] = useState<(typeof PRICE_BANDS)[number]['value']>('any');
  const [marketFilter, setMarketFilter] = useState('All markets');
  const [inStockOnly, setInStockOnly] = useState(true);
  const [sort, setSort] = useState<(typeof SORTS)[number]>('Newest');
  const [page, setPage] = useState(1);

  const toggleCat = (name: string) => {
    setSelectedCats((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
    setPage(1);
  };

  const openMarketIds = useMemo(() => new Set(markets.filter((m) => m.days.includes(day)).map((m) => m.id)), [day]);

  const dayFiltered = useMemo(
    () =>
      listed.filter((p) => {
        const f = farmer(p.farmerId!);
        return f?.markets.some((id) => openMarketIds.has(id));
      }),
    [openMarketIds],
  );

  const priceBandFn = PRICE_BANDS.find((b) => b.value === priceBand)!.test;

  const matches = useMemo(() => {
    const filtered = dayFiltered.filter((p) => {
      if (selectedCats.length > 0 && !selectedCats.includes(p.category)) return false;
      if (!priceBandFn(p.price)) return false;
      if (marketFilter !== 'All markets' && p.marketName !== marketFilter) return false;
      if (inStockOnly && (p.status !== 'available' || p.stock === 0)) return false;
      return true;
    });
    const sorted = [...filtered];
    if (sort === 'Price, low to high') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'Price, high to low') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'Top rated')
      sorted.sort((a, b) => (farmer(b.farmerId!)?.rating ?? 0) - (farmer(a.farmerId!)?.rating ?? 0));
    return sorted;
  }, [dayFiltered, selectedCats, priceBandFn, marketFilter, inStockOnly, sort]);

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const slice = matches.slice(from, from + PAGE_SIZE);

  const clearAll = () => {
    setDay(6);
    setSelectedCats([]);
    setPriceBand('any');
    setMarketFilter('All markets');
    setInStockOnly(true);
    setSort('Newest');
    setPage(1);
  };

  const stallsSelling = new Set(dayFiltered.map((p) => p.farmerId)).size;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="font-hand text-hand text-ink-muted">
          {DOW.find((d) => d.value === day)?.label} · {markets.length} markets · {stallsSelling} stalls selling
        </p>
        <h1 className="text-h1">Products</h1>
        <p className="text-body-lg max-w-155">
          Everything the stalls have listed for this week. Filter by category, price, market and day, then add to your
          cart.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside
          aria-label="Filters"
          className="border-line-strong bg-surface-raised shadow-tag flex flex-col gap-4 rounded-md border-[1.5px] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-h3">Filters</h2>
            <Chip onClick={clearAll}>Clear all</Chip>
          </div>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="text-small mb-2 p-0 font-bold">Market day</legend>
            {DOW.map((d) => (
              <label key={d.value} className="flex items-center gap-2 text-[15px]">
                <input
                  type="radio"
                  name="day"
                  disabled={!sellsOn(d.value)}
                  checked={day === d.value}
                  onChange={() => {
                    setDay(d.value);
                    setPage(1);
                  }}
                  className="accent-brand size-4.5"
                />
                <span className={!sellsOn(d.value) ? 'text-ink-muted line-through' : undefined}>{d.label}</span>
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-2">
            <span className="text-small font-bold">Category</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Chip key={c.id} pressed={selectedCats.includes(c.name)} onClick={() => toggleCat(c.name)}>
                  {c.name} <span className="text-[12px] tabular-nums opacity-80">{c.count}</span>
                </Chip>
              ))}
            </div>
          </div>

          <SelectField
            id="price"
            label="Price per unit"
            value={priceBand}
            onChange={(e) => {
              setPriceBand(e.target.value as typeof priceBand);
              setPage(1);
            }}
            options={PRICE_BANDS.map((b) => ({
              value: b.value,
              label: `${b.label} (${dayFiltered.filter((p) => b.test(p.price)).length})`,
            }))}
          />

          <SelectField
            id="market"
            label="Market"
            value={marketFilter}
            onChange={(e) => {
              setMarketFilter(e.target.value);
              setPage(1);
            }}
            options={['All markets', ...markets.map((m) => m.name)]}
          />

          <Checkbox
            id="in-stock"
            checked={inStockOnly}
            onChange={(e) => {
              setInStockOnly(e.target.checked);
              setPage(1);
            }}
          >
            In stock only
            <small className="text-ink-muted mt-0.5 block text-[13px]">Hides sold-out and paused products</small>
          </Checkbox>
        </aside>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body">
              <b>{matches.length} products</b> match on {DOW.find((d) => d.value === day)?.label}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-small text-ink-muted">Sort</span>
              <div className="flex flex-wrap gap-2">
                {SORTS.map((s) => (
                  <Chip key={s} pressed={sort === s} onClick={() => setSort(s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          {matches.length ? (
            <>
              <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                {slice.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                {pages > 1 ? (
                  <>
                    <span className="text-small text-ink-muted">
                      Showing {from + 1}–{from + slice.length} of {matches.length}
                    </span>
                    <Pagination page={currentPage} pages={pages} onChange={setPage} />
                  </>
                ) : (
                  <span className="text-small text-ink-muted">All {matches.length} products on one page</span>
                )}
              </div>
            </>
          ) : (
            <DataState
              title="Nothing matches these filters"
              text="Try removing the price filter, or widen it to another category or market."
              action={<Chip onClick={clearAll}>Clear all filters</Chip>}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
