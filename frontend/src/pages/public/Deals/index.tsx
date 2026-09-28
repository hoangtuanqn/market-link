import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CatalogApi from '@/api-requests/catalog.requests';
import DealApi, { type DealListParams } from '@/api-requests/deal.requests';
import DealCard from '@/components/DealCard';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import { SelectField } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import useRequest from '@/hooks/useRequest';
import type { MarketType } from '@/types/market.types';

const PAGE_SIZE = 12;
/** The market filter's "no filter" value. */
const ALL_MARKETS = 'all';
const NO_MARKETS: MarketType[] = [];

/**
 * FR-125 — near-expiry deals (spec §4.5.4): one card per product and pickup day customers can still order for, nearest
 * day first, then the biggest discount. Filtering and paging happen on the server.
 */
const DealsPage = () => {
  const { t } = useTranslation('Deals');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [marketFilter, setMarketFilter] = useState(ALL_MARKETS);
  const [page, setPage] = useState(1);

  const { state: categoriesLoad } = useRequest('categories', () => CatalogApi.listCategories());
  const { state: marketsLoad } = useRequest('markets', () =>
    CatalogApi.listMarkets({ pageSize: 50 }).then((result) => result.items),
  );
  const categories = categoriesLoad.kind === 'ready' ? categoriesLoad.data : [];
  const markets = marketsLoad.kind === 'ready' ? marketsLoad.data : NO_MARKETS;

  const params: DealListParams = {
    categoryId: categoryId ?? undefined,
    marketId: marketFilter === ALL_MARKETS ? undefined : Number(marketFilter),
    page,
    pageSize: PAGE_SIZE,
  };
  const { state: load, retry } = useRequest(`deals:${JSON.stringify(params)}`, () => DealApi.list(params));
  const items = load.kind === 'ready' ? load.data.items : [];
  const total = load.kind === 'ready' ? load.data.total : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const filtered = categoryId !== null || marketFilter !== ALL_MARKETS;

  const pickCategory = (id: number | null) => {
    setCategoryId(id);
    setPage(1);
  };
  const clear = () => {
    setCategoryId(null);
    setMarketFilter(ALL_MARKETS);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-hand md:text-display text-h1">{t('title')}</h1>
        <p className="text-body-lg max-w-155">{t('intro')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-small font-bold">{t('filters.category')}</span>
          <div className="flex flex-wrap gap-2">
            <Chip pressed={categoryId === null} onClick={() => pickCategory(null)}>
              {t('filters.allCategories')}
            </Chip>
            {categories.map((c) => (
              <Chip key={c.id} pressed={categoryId === c.id} onClick={() => pickCategory(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>
        </div>
        <SelectField
          id="deals-market"
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
      </div>

      {load.kind === 'loading' ? (
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          <MarketCardSkeleton count={3} />
        </div>
      ) : load.kind === 'error' ? (
        <LoadError noun={t('noun')} onRetry={retry} />
      ) : items.length ? (
        <>
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((d) => (
              <DealCard key={`${d.productId}@${d.stockDate}`} deal={d} />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {pages > 1 ? (
              <>
                <span className="text-small text-ink-muted">
                  {t('pager.showing', { from: from + 1, to: from + items.length, total })}
                </span>
                <Pagination page={currentPage} pages={pages} onChange={setPage} />
              </>
            ) : (
              <span className="text-small text-ink-muted">{t('pager.count', { count: total })}</span>
            )}
          </div>
        </>
      ) : filtered ? (
        <DataState
          title={t('emptyFiltered.title')}
          text={t('emptyFiltered.text')}
          action={<Chip onClick={clear}>{t('clear')}</Chip>}
        />
      ) : (
        <DataState
          fill
          title={t('empty.title')}
          text={t('empty.text')}
          action={
            <ButtonLink to="/products" variant="secondary" size="sm">
              {t('empty.browse')}
            </ButtonLink>
          }
        />
      )}
    </div>
  );
};

export default DealsPage;
