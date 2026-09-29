import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import FavoriteApi from '@/api-requests/favorite.requests';
import NotificationApi from '@/api-requests/notification.requests';
import OrderApi, { toOrderCard } from '@/api-requests/order.requests';
import ProductApi, { toProduct } from '@/api-requests/product.requests';
import OrderTicket from '@/components/OrderTicket';
import ProductCard from '@/components/ProductCard';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState } from '@/components/ui/data-state';
import useClock from '@/hooks/useClock';
import useRequest from '@/hooks/useRequest';
import useSession from '@/hooks/useSession';
import { nowLabel } from '@/lib/format';
import type { OrderType } from '@/types/order.types';
import { settledProducts } from './favoriteProducts';

const UPCOMING_STATUSES = new Set(['placed', 'accepted', 'ready']);
/** How many favourite products to preview in "New from favorites". */
const FAV_PRODUCTS_SHOWN = 3;

/**
 * FR-010 FR-036 FR-060 — customer dashboard; content is not specified in the SRS beyond "securely access their
 * dashboard". Each block fetches its own data and carries its own loading/empty/error state (FR-084) — one slow or
 * failed request never blocks the rest of the page.
 */
const CustomerDashboardPage = () => {
  const { t } = useTranslation('CustomerDashboard');
  const { t: tc } = useTranslation();
  const { user } = useSession();
  const now = useClock();
  const [showSellCard, setShowSellCard] = useState(true);

  const { state: ordersLoad, mutate: mutateOrders } = useRequest('dash-orders', () => OrderApi.list({ pageSize: 50 }));
  const orders = ordersLoad.kind === 'ready' ? ordersLoad.data.items.map(toOrderCard) : [];
  const upcoming = orders.filter((o) => UPCOMING_STATUSES.has(o.status));
  const placedCount = upcoming.filter((o) => o.status === 'placed').length;
  const acceptedCount = upcoming.filter((o) => o.status === 'accepted').length;
  const readyCount = upcoming.filter((o) => o.status === 'ready').length;
  const onOrderChanged = (updated: OrderType) =>
    mutateOrders((page) => ({
      ...page,
      items: page.items.map((i) => (i.orderId === updated.id ? { ...i, status: updated.status } : i)),
    }));

  const { state: favsLoad } = useRequest('dash-favs', () => FavoriteApi.list());
  const favs = favsLoad.kind === 'ready' ? favsLoad.data : [];
  const stallFavCount = favs.filter((f) => f.targetType === 'farmer').length;
  const productFavs = favs.filter((f) => f.targetType === 'product');
  const marketFavCount = favs.filter((f) => f.targetType === 'market').length;

  const { state: unreadLoad } = useRequest('dash-unread', () => NotificationApi.unreadCount());
  const unread = unreadLoad.kind === 'ready' ? unreadLoad.data.data.count : 0;

  const favProductIds = productFavs.slice(0, FAV_PRODUCTS_SHOWN).map((f) => f.targetId);
  const { state: favProductsLoad } = useRequest(`dash-fav-products:${favProductIds.join(',')}`, () =>
    Promise.allSettled(favProductIds.map((id) => ProductApi.get(id))).then(settledProducts),
  );
  const newFromFavorites =
    favProductsLoad.kind === 'ready' ? favProductsLoad.data.map((dto) => toProduct(dto.product, dto.description)) : [];
  const favProductsLoading = favsLoad.kind === 'loading' || favProductsLoad.kind === 'loading';
  const favProductsError = favsLoad.kind === 'error' || favProductsLoad.kind === 'error';

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">
            <time dateTime={now.toISOString()}>{nowLabel(now)}</time>
          </p>
          <h1 className="text-h1">{t('greeting', { name: user?.fullName ?? '', count: upcoming.length })}</h1>
          <p className="text-body-lg max-w-155">{t('intro')}</p>
        </div>
        <ButtonLink to="/markets">{t('browseMarkets')}</ButtonLink>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card as="article" className="flex flex-col gap-2 p-4">
          {ordersLoad.kind === 'loading' ? (
            <p role="status" className="text-small text-ink-muted">
              {tc('notify.list.loading')}
            </p>
          ) : ordersLoad.kind === 'error' ? (
            <DataState
              variant="error"
              title={tc('loadError.title', { noun: t('noun.orders') })}
              text={tc('loadError.text')}
            />
          ) : (
            <Link to="/orders" className="flex flex-col gap-2 text-inherit no-underline">
              <b className="text-[17px]">{t('cards.upcoming', { count: upcoming.length })}</b>
              <span className="text-small text-ink-muted">
                {t('cards.upcomingBreakdown', { placed: placedCount, accepted: acceptedCount, ready: readyCount })}
              </span>
            </Link>
          )}
        </Card>
        <Card as="article" className="flex flex-col gap-2 p-4">
          {favsLoad.kind === 'loading' ? (
            <p role="status" className="text-small text-ink-muted">
              {tc('notify.list.loading')}
            </p>
          ) : favsLoad.kind === 'error' ? (
            <DataState
              variant="error"
              title={tc('loadError.title', { noun: t('noun.favorites') })}
              text={tc('loadError.text')}
            />
          ) : (
            <Link to="/favorites" className="flex flex-col gap-2 text-inherit no-underline">
              <b className="text-[17px]">{t('cards.favorites', { count: favs.length })}</b>
              <span className="text-small text-ink-muted">
                {[
                  t('cards.stalls', { count: stallFavCount }),
                  t('cards.products', { count: productFavs.length }),
                  t('cards.markets', { count: marketFavCount }),
                ].join(' · ')}
              </span>
            </Link>
          )}
        </Card>
        <Card as="article" className="flex flex-col gap-2 p-4">
          {unreadLoad.kind === 'loading' ? (
            <p role="status" className="text-small text-ink-muted">
              {tc('notify.list.loading')}
            </p>
          ) : unreadLoad.kind === 'error' ? (
            <DataState
              variant="error"
              title={tc('loadError.title', { noun: t('noun.notifications') })}
              text={tc('loadError.text')}
            />
          ) : (
            <Link to="/notifications" className="flex flex-col gap-2 text-inherit no-underline">
              <b className="text-[17px]">{t('cards.unread', { count: unread })}</b>
              <span className="text-small text-ink-muted">{t('cards.unreadText')}</span>
            </Link>
          )}
        </Card>
        <Card as="article" className="flex flex-col gap-2 p-4">
          <Link to="/account" className="flex flex-col gap-2 text-inherit no-underline">
            <b className="text-[17px]">{t('cards.account')}</b>
            <span className="text-small text-ink-muted">{user?.fullName ?? ''}</span>
          </Link>
        </Card>
      </div>

      {showSellCard && (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex max-w-140 flex-col gap-2">
            <p className="text-overline text-ink-muted uppercase">{t('sell.overline')}</p>
            <h2 className="text-h3">{t('sell.title')}</h2>
            <p className="text-[15px]">{t('sell.text')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/become-farmer">{t('sell.apply')}</ButtonLink>
            <button
              type="button"
              onClick={() => setShowSellCard(false)}
              className="text-brand min-h-11 cursor-pointer bg-transparent px-2 font-bold underline-offset-4 hover:underline"
            >
              {t('sell.dismiss')}
            </button>
          </div>
        </Card>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-h2">{t('nextPickups')}</h2>
          <Link to="/orders" className="text-brand underline">
            {t('allOrders')}
          </Link>
        </div>
        {ordersLoad.kind === 'loading' ? (
          <p role="status" className="text-ink-muted">
            {tc('notify.list.loading')}
          </p>
        ) : ordersLoad.kind === 'error' ? (
          <DataState
            title={tc('loadError.title', { noun: t('noun.orders') })}
            text={tc('loadError.text')}
            variant="error"
          />
        ) : upcoming.length === 0 ? (
          <DataState title={t('empty.pickups.title')} text={t('empty.pickups.text')} />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.slice(0, 3).map((o) => (
              <OrderTicket key={o.code} order={o} fluid onChanged={onOrderChanged} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-h2">{t('newFromFavorites')}</h2>
          <Link to="/favorites" className="text-brand underline">
            {t('favorites')}
          </Link>
        </div>
        {favProductsLoading ? (
          <p role="status" className="text-ink-muted">
            {tc('notify.list.loading')}
          </p>
        ) : favProductsError ? (
          <DataState
            title={tc('loadError.title', { noun: t('noun.products') })}
            text={tc('loadError.text')}
            variant="error"
          />
        ) : newFromFavorites.length === 0 ? (
          <DataState title={t('empty.favorites.title')} text={t('empty.favorites.text')} />
        ) : (
          <div className="grid gap-x-4 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
            {newFromFavorites.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CustomerDashboardPage;
