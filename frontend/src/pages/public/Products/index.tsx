import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import CatalogApi from '@/api-requests/catalog.requests';
import ProductApi, { type ProductListParams } from '@/api-requests/product.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import ProductCard from '@/components/ProductCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import { SelectField } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import useRequest from '@/hooks/useRequest';
import { dayName, vnd } from '@/lib/format';
import type { MarketType } from '@/types/market.types';

const PAGE_SIZE = 12;
/** Monday first; 0 = Sunday. */
const DOW = [1, 2, 3, 4, 5, 6, 0];
const LOW = 30000;
const HIGH = 80000;
/** Price bands become `minPrice`/`maxPrice` on the request (contract §5); prices are whole đồng. */
const PRICE_BANDS = [
  { value: 'any', min: undefined, max: undefined },
  { value: 'low', min: undefined, max: LOW - 1 },
  { value: 'mid', min: LOW, max: HIGH },
  { value: 'high', min: HIGH + 1, max: undefined },
] as const;
type PriceBand = (typeof PRICE_BANDS)[number]['value'];
/** Chip label → the server's whitelist value. */
const SORTS = { newest: 'newest', priceAsc: 'price_asc', priceDesc: 'price_desc', rating: 'rating' } as const;
type SortKey = keyof typeof SORTS;
/** The market filter's "no filter" value. */
const ALL_MARKETS = 'all';
const NO_MARKETS: MarketType[] = [];

/** FR-020 FR-021 — browse products by category, price, market and day. Filtering and paging happen on the server. */
const ProductsPage = () => {
  const { t } = useTranslation('Products');
  const [day, setDay] = useState(6);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [priceBand, setPriceBand] = useState<PriceBand>('any');
  const [marketFilter, setMarketFilter] = useState(ALL_MARKETS);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);

  const { state: marketsLoad } = useRequest('markets', () =>
    CatalogApi.listMarkets({ pageSize: 50 }).then((result) => result.items),
  );
  const { state: categoriesLoad } = useRequest('categories', () => CatalogApi.listCategories());
  const markets = marketsLoad.kind === 'ready' ? marketsLoad.data : NO_MARKETS;
  const categories = categoriesLoad.kind === 'ready' ? categoriesLoad.data : [];

  const band = PRICE_BANDS.find((b) => b.value === priceBand)!;
  const params: ProductListParams = {
    day,
    categoryId: categoryId ?? undefined,
    marketId: marketFilter === ALL_MARKETS ? undefined : Number(marketFilter),
    minPrice: band.min,
    maxPrice: band.max,
    sort: SORTS[sort],
    page,
    pageSize: PAGE_SIZE,
  };
  const { state: load, retry } = useRequest(`products:${JSON.stringify(params)}`, () => ProductApi.list(params));

  const pageItems = load.kind === 'ready' ? load.data.items : [];
  // The contract has no in-stock parameter yet; the tick hides sold-out and paused items on the page you are on.
  const shown = inStockOnly ? pageItems.filter((p) => p.status === 'available' && p.stock > 0) : pageItems;
  const total = load.kind === 'ready' ? load.data.total : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const from = (currentPage - 1) * PAGE_SIZE;

  /** A day no market opens on is struck through: nothing can be on sale then. */
  const anyMarketOn = (dow: number) => marketsLoad.kind !== 'ready' || markets.some((m) => m.days.includes(dow));

  const clearAll = () => {
    setDay(6);
    setCategoryId(null);
    setPriceBand('any');
    setMarketFilter(ALL_MARKETS);
    setInStockOnly(true);
    setSort('newest');
    setPage(1);
  };

  const stallsSelling = new Set(pageItems.map((p) => p.farmerId)).size;
  const dayLabel = dayName(day, 'long');
  const bandLabel = (value: PriceBand) => t(`price.${value}`, { low: vnd(LOW), high: vnd(HIGH) });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="font-hand text-hand text-ink-muted">
          {dayLabel} · {t('markets', { count: markets.length })} · {t('stallsSelling', { count: stallsSelling })}
        </p>
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg max-w-155">{t('intro')}</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside
          aria-label={t('filters.title')}
          className="border-line-strong bg-surface-raised shadow-tag flex flex-col gap-4 rounded-md border-[1.5px] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-h3">{t('filters.title')}</h2>
            <Chip onClick={clearAll}>{t('filters.clearAll')}</Chip>
          </div>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="text-small mb-2 p-0 font-bold">{t('filters.day')}</legend>
            {DOW.map((d) => (
              <label key={d} className="flex items-center gap-2 text-[15px]">
                <input
                  type="radio"
                  name="day"
                  disabled={!anyMarketOn(d)}
                  checked={day === d}
                  onChange={() => {
                    setDay(d);
                    setPage(1);
                  }}
                  className="accent-brand size-4.5"
                />
                <span className={!anyMarketOn(d) ? 'text-ink-muted line-through' : undefined}>
                  {dayName(d, 'long')}
                </span>
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-2">
            <span className="text-small font-bold">{t('filters.category')}</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  pressed={categoryId === c.id}
                  onClick={() => {
                    setCategoryId((current) => (current === c.id ? null : c.id));
                    setPage(1);
                  }}
                >
                  {c.name}
                </Chip>
              ))}
            </div>
          </div>

          <SelectField
            id="price"
            label={t('filters.price')}
            value={priceBand}
            onChange={(e) => {
              setPriceBand(e.target.value as PriceBand);
              setPage(1);
            }}
            options={PRICE_BANDS.map((b) => ({ value: b.value, label: bandLabel(b.value) }))}
          />

          <SelectField
            id="market"
            label={t('filters.market')}
            value={marketFilter}
            onChange={(e) => {
              setMarketFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: ALL_MARKETS, label: t('filters.allMarkets') },
              ...markets.map((m) => ({ value: String(m.id), label: m.name })),
            ]}
          />

          <Checkbox id="in-stock" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)}>
            {t('filters.inStock')}
            <small className="text-ink-muted mt-0.5 block text-[13px]">{t('filters.inStockNote')}</small>
          </Checkbox>
        </aside>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body">
              <Trans t={t} i18nKey="summary" count={total} values={{ day: dayLabel }} components={{ b: <b /> }} />
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-small text-ink-muted">{t('sort')}</span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SORTS) as SortKey[]).map((s) => (
                  <Chip
                    key={s}
                    pressed={sort === s}
                    onClick={() => {
                      setSort(s);
                      setPage(1);
                    }}
                  >
                    {t(`sorts.${s}`)}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          {load.kind === 'loading' ? (
            <MarketCardSkeleton count={6} />
          ) : load.kind === 'error' ? (
            <LoadError noun={t('error.noun')} onRetry={retry} />
          ) : shown.length ? (
            <>
              <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                {pages > 1 ? (
                  <>
                    <span className="text-small text-ink-muted">
                      {t('pager.showing', { from: from + 1, to: from + pageItems.length, total })}
                    </span>
                    <Pagination page={currentPage} pages={pages} onChange={setPage} />
                  </>
                ) : (
                  <span className="text-small text-ink-muted">{t('pager.onePage', { count: total })}</span>
                )}
              </div>
            </>
          ) : (
            <DataState
              title={t('empty.title')}
              text={t('empty.text')}
              action={<Chip onClick={clearAll}>{t('empty.clear')}</Chip>}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
