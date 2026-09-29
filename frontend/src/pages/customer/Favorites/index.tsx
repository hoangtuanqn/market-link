import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import CatalogApi from '@/api-requests/catalog.requests';
import FavoriteApi, { type FavoriteDto } from '@/api-requests/favorite.requests';
import ProductApi from '@/api-requests/product.requests';
import StallApi, { type StallDetailDto } from '@/api-requests/stall.requests';
import { CheckIcon, CloseIcon } from '@/components/icons';
import MarketCard from '@/components/MarketCard';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import Tabs from '@/components/ui/tabs';
import { Cart } from '@/lib/cart';
import type { MarketType } from '@/types/market.types';
import Helper from '@/utils/helper';
import useRequest from '@/hooks/useRequest';
import Notification from '@/utils/notification';
import { settledRows } from './favorites.helpers';

const FILTERS = ['all', 'inStock', 'soldOut'] as const;
type Filter = (typeof FILTERS)[number];

type StallRow = { fav: FavoriteDto; detail: StallDetailDto | null };
type MarketRow = { fav: FavoriteDto; detail: MarketType | null };

const NO_FAVORITES: FavoriteDto[] = [];
const NO_STALLS: StallRow[] = [];
const NO_MARKETS: MarketRow[] = [];

const FavoriteProductRow = ({
  fav,
  onAddToCart,
  onRemove,
}: {
  fav: FavoriteDto;
  onAddToCart: () => void;
  onRemove: () => void;
}) => {
  const { t } = useTranslation('CustomerFavorites');

  return (
    <li className="border-line-strong bg-surface-raised shadow-tag grid grid-cols-[72px_minmax(0,1fr)] items-center gap-4 rounded-md border-[1.5px] p-4 md:grid-cols-[96px_minmax(0,1fr)_auto]">
      <span
        className={Helper.cn(
          'border-line bg-surface-sunken text-ink-muted font-hand flex aspect-4/3 w-18 items-center justify-center overflow-hidden rounded-[6px] border p-1 text-center text-[15px] md:w-24',
          !fav.available && 'grayscale',
        )}
      >
        {fav.imageUrl ? (
          <img src={Helper.mediaUrl(fav.imageUrl)} alt="" className="size-full object-cover" />
        ) : (
          fav.title.charAt(0).toUpperCase()
        )}
      </span>
      <div>
        <b className="block text-[17px] leading-tight">
          <Link
            to={`/products/${fav.targetId}`}
            className="text-inherit no-underline hover:underline hover:underline-offset-3"
          >
            {fav.title}
          </Link>
        </b>
        {fav.subtitle && <p className="text-small text-ink-muted mt-0.5">{fav.subtitle}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
          {fav.available ? (
            <span className="bg-status-ready-bg text-status-ready-ink inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 font-bold">
              <CheckIcon size={14} />
              {t('inStock')}
            </span>
          ) : (
            <>
              <span className="bg-status-declined-bg text-status-declined-ink inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 font-bold">
                <CloseIcon size={14} />
                {t('soldOut')}
              </span>
              <span className="text-ink-muted">{t('alertOn')}</span>
            </>
          )}
        </div>
      </div>
      <div className="col-span-full flex flex-row flex-wrap items-center gap-2 md:col-span-1 md:flex-col md:items-end">
        {fav.available && (
          <Button size="sm" onClick={onAddToCart}>
            {t('addToCart')}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onRemove}>
          {t('remove')}
        </Button>
      </div>
    </li>
  );
};

const UnavailableFavoriteRow = ({ fav, onRemove }: { fav: FavoriteDto; onRemove: () => void }) => {
  const { t } = useTranslation('CustomerFavorites');

  return (
    <Card as="article" className="flex flex-col gap-3 p-4">
      <div>
        <b className="text-ink-muted block text-[17px] leading-tight">{fav.title}</b>
        {fav.subtitle && <p className="text-small text-ink-muted mt-0.5">{fav.subtitle}</p>}
        <span className="bg-status-declined-bg text-status-declined-ink mt-2 inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] font-bold">
          <CloseIcon size={14} />
          {t('unavailable')}
        </span>
      </div>
      <Button variant="ghost" size="sm" className="w-fit" onClick={onRemove}>
        {t('remove')}
      </Button>
    </Card>
  );
};

const FavoriteStallCard = ({ stall, onRemove }: { stall: StallDetailDto; onRemove: () => void }) => {
  const { t } = useTranslation('CustomerFavorites');
  const marketNames = stall.markets.map((m) => m.marketName).join(', ');

  return (
    <Card as="article" className="grid grid-cols-[56px_1fr] gap-x-4 gap-y-3 p-4">
      <span
        aria-hidden="true"
        className="bg-brand text-on-brand font-hand grid size-14 place-items-center rounded-full text-[28px] uppercase"
      >
        {stall.stallName.charAt(0)}
      </span>
      <div>
        <h3 className="text-[17px] leading-tight font-bold">
          <Link
            to={`/stalls/${stall.farmerId}`}
            className="text-inherit no-underline hover:underline hover:underline-offset-3"
          >
            {stall.stallName}
          </Link>
        </h3>
        {marketNames && <p className="text-small text-ink-muted mt-0.5">{marketNames}</p>}
      </div>
      <div className="col-span-full flex flex-wrap gap-2">
        <ButtonLink to={`/stalls/${stall.farmerId}`} size="sm">
          {t('viewStall')}
        </ButtonLink>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          {t('remove')}
        </Button>
      </div>
    </Card>
  );
};

const CustomerFavoritesPage = () => {
  const { t } = useTranslation('CustomerFavorites');
  const { t: tc } = useTranslation();
  const [tab, setTab] = useState<'products' | 'stalls' | 'markets'>('products');
  const [filter, setFilter] = useState<Filter>('all');

  const {
    state: productsLoad,
    retry: retryProducts,
    mutate: mutateProducts,
  } = useRequest('favorites:products', () => FavoriteApi.list('product'));
  const {
    state: stallFavsLoad,
    retry: retryStallFavs,
    mutate: mutateStallFavs,
  } = useRequest('favorites:stalls', () => FavoriteApi.list('farmer'));
  const {
    state: marketFavsLoad,
    retry: retryMarketFavs,
    mutate: mutateMarketFavs,
  } = useRequest('favorites:markets', () => FavoriteApi.list('market'));

  const products = productsLoad.kind === 'ready' ? productsLoad.data : NO_FAVORITES;
  const stallFavs = stallFavsLoad.kind === 'ready' ? stallFavsLoad.data : NO_FAVORITES;
  const marketFavs = marketFavsLoad.kind === 'ready' ? marketFavsLoad.data : NO_FAVORITES;

  const stallIds = stallFavs.map((f) => f.targetId).join(',');
  const {
    state: stallDetailsLoad,
    retry: retryStallDetails,
    mutate: mutateStallDetails,
  } = useRequest(`favorite-stall-details:${tab === 'stalls' ? stallIds : 'idle'}`, () =>
    tab === 'stalls' && stallFavsLoad.kind === 'ready'
      ? Promise.allSettled(stallFavs.map((fav) => StallApi.get(fav.targetId))).then((results) =>
          settledRows(stallFavs, results),
        )
      : Promise.resolve(NO_STALLS),
  );

  const marketIds = marketFavs.map((f) => f.targetId).join(',');
  const {
    state: marketDetailsLoad,
    retry: retryMarketDetails,
    mutate: mutateMarketDetails,
  } = useRequest(`favorite-market-details:${tab === 'markets' ? marketIds : 'idle'}`, () =>
    tab === 'markets' && marketFavsLoad.kind === 'ready'
      ? Promise.allSettled(marketFavs.map((fav) => CatalogApi.getMarket(fav.targetId).then((dto) => dto.market))).then(
          (results) => settledRows(marketFavs, results),
        )
      : Promise.resolve(NO_MARKETS),
  );

  const counts: Record<Filter, number> = {
    all: products.length,
    inStock: products.filter((p) => p.available).length,
    soldOut: products.filter((p) => !p.available).length,
  };
  const shownProducts = products.filter((p) => {
    if (filter === 'inStock') return p.available;
    if (filter === 'soldOut') return !p.available;
    return true;
  });

  const addToCart = async (fav: FavoriteDto) => {
    try {
      const detail = await ProductApi.get(fav.targetId);
      const p = detail.product;
      Cart.add(
        {
          productId: p.id,
          name: p.name,
          unit: p.unit,
          price: Number(p.price),
          max: p.stockQuantity,
          farmerId: p.farmerId,
          stallName: p.stallName,
        },
        1,
      );
      Notification.success({ title: t('toast.addedTitle'), text: t('toast.added', { name: p.name }) });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    }
  };

  const removeProduct = async (fav: FavoriteDto) => {
    try {
      await FavoriteApi.remove(fav.id);
      mutateProducts((list) => list.filter((f) => f.id !== fav.id));
      Notification.info({ title: t('toast.removedTitle'), text: t('toast.removed', { name: fav.title }) });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    }
  };

  const removeStall = async (fav: FavoriteDto) => {
    try {
      await FavoriteApi.remove(fav.id);
      mutateStallFavs((list) => list.filter((f) => f.id !== fav.id));
      mutateStallDetails((list) => list.filter((item) => item.fav.id !== fav.id));
      Notification.info({ title: t('toast.removedTitle'), text: t('toast.removed', { name: fav.title }) });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    }
  };

  const removeMarket = async (fav: FavoriteDto) => {
    try {
      await FavoriteApi.remove(fav.id);
      mutateMarketFavs((list) => list.filter((f) => f.id !== fav.id));
      mutateMarketDetails((list) => list.filter((item) => item.fav.id !== fav.id));
      Notification.info({ title: t('toast.removedTitle'), text: t('toast.removed', { name: fav.title }) });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    }
  };

  const dropMarketFavorite = (favoriteId: number) => {
    mutateMarketFavs((list) => list.filter((f) => f.id !== favoriteId));
    mutateMarketDetails((list) => list.filter((item) => item.fav.id !== favoriteId));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body-lg max-w-155">{t('intro')}</p>
        </div>
        <ButtonLink to="/products" variant="secondary">
          {t('findMore')}
        </ButtonLink>
      </div>

      <Tabs
        label={t('tabs.label')}
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'products', label: t('tabs.products'), count: products.length },
          { id: 'stalls', label: t('tabs.stalls'), count: stallFavs.length },
          { id: 'markets', label: t('tabs.markets'), count: marketFavs.length },
        ]}
      />

      {tab === 'products' &&
        (productsLoad.kind === 'loading' ? (
          <p role="status" className="text-ink-muted">
            {t('loading')}
          </p>
        ) : productsLoad.kind === 'error' ? (
          <LoadError noun={t('error.products')} onRetry={retryProducts} />
        ) : products.length === 0 ? (
          <DataState
            fill
            title={t('empty.products.title')}
            text={t('empty.products.text')}
            action={<ButtonLink to="/products">{t('empty.products.browse')}</ButtonLink>}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)}>
                    {t(`filters.${f}`)} <span className="text-[12px] tabular-nums opacity-80">{counts[f]}</span>
                  </Chip>
                ))}
              </div>
            </div>

            {shownProducts.length === 0 ? (
              <DataState title={t('filters.emptyTitle')} text={t('filters.emptyText')} />
            ) : (
              <ul className="m-0 flex flex-col gap-3 p-0">
                {shownProducts.map((fav) => (
                  <FavoriteProductRow
                    key={fav.id}
                    fav={fav}
                    onAddToCart={() => void addToCart(fav)}
                    onRemove={() => void removeProduct(fav)}
                  />
                ))}
              </ul>
            )}
            <p className="text-small text-ink-muted">{t('holdNote')}</p>
          </div>
        ))}

      {tab === 'stalls' &&
        (stallFavsLoad.kind === 'loading' || stallDetailsLoad.kind === 'loading' ? (
          <p role="status" className="text-ink-muted">
            {t('loading')}
          </p>
        ) : stallFavsLoad.kind === 'error' ? (
          <LoadError noun={t('error.stalls')} onRetry={retryStallFavs} />
        ) : stallDetailsLoad.kind === 'error' ? (
          <LoadError noun={t('error.stalls')} onRetry={retryStallDetails} />
        ) : stallFavs.length === 0 ? (
          <DataState
            fill
            title={t('empty.stalls.title')}
            text={t('empty.stalls.text')}
            action={<ButtonLink to="/markets">{t('empty.stalls.browse')}</ButtonLink>}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-small text-ink-muted">{t('stallsNote')}</p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {stallDetailsLoad.kind === 'ready' &&
                stallDetailsLoad.data.map((row) =>
                  row.detail ? (
                    <FavoriteStallCard key={row.fav.id} stall={row.detail} onRemove={() => void removeStall(row.fav)} />
                  ) : (
                    <UnavailableFavoriteRow key={row.fav.id} fav={row.fav} onRemove={() => void removeStall(row.fav)} />
                  ),
                )}
            </div>
          </div>
        ))}

      {tab === 'markets' &&
        (marketFavsLoad.kind === 'loading' || marketDetailsLoad.kind === 'loading' ? (
          <p role="status" className="text-ink-muted">
            {t('loading')}
          </p>
        ) : marketFavsLoad.kind === 'error' ? (
          <LoadError noun={t('error.markets')} onRetry={retryMarketFavs} />
        ) : marketDetailsLoad.kind === 'error' ? (
          <LoadError noun={t('error.markets')} onRetry={retryMarketDetails} />
        ) : marketFavs.length === 0 ? (
          <DataState
            fill
            title={t('empty.markets.title')}
            text={t('empty.markets.text')}
            action={<ButtonLink to="/markets">{t('empty.markets.browse')}</ButtonLink>}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {marketDetailsLoad.kind === 'ready' &&
                marketDetailsLoad.data.map((row) =>
                  row.detail ? (
                    <MarketCard
                      key={row.fav.id}
                      market={row.detail}
                      favoriteId={row.fav.id}
                      onFavoriteChange={(id) => id === null && dropMarketFavorite(row.fav.id)}
                    />
                  ) : (
                    <UnavailableFavoriteRow
                      key={row.fav.id}
                      fav={row.fav}
                      onRemove={() => void removeMarket(row.fav)}
                    />
                  ),
                )}
            </div>
            <p className="text-small text-ink-muted">{t('marketsNote')}</p>
          </div>
        ))}
    </div>
  );
};

export default CustomerFavoritesPage;
