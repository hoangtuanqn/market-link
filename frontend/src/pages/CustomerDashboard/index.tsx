import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import OrderTicket from '@/components/OrderTicket';
import ProductCard from '@/components/ProductCard';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { dashboardFavoriteProducts, orders } from '@/data/customer';
import useClock from '@/hooks/useClock';
import { nowLabel } from '@/lib/format';

const nextPickups = orders
  .filter((o) => o.status === 'ready' || o.status === 'accepted' || o.status === 'placed')
  .slice(0, 3);

/**
 * FR-010 FR-036 FR-060 — customer dashboard; content is not specified in the SRS beyond "securely access their
 * dashboard".
 */
const CustomerDashboardPage = () => {
  const { t } = useTranslation('CustomerDashboard');
  const now = useClock();
  const [showSellCard, setShowSellCard] = useState(true);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">
            <time dateTime={now.toISOString()}>{nowLabel(now)}</time>
          </p>
          <h1 className="text-h1">{t('greeting', { name: 'Khang', count: 3 })}</h1>
          <p className="text-body-lg max-w-155">{t('intro')}</p>
        </div>
        <ButtonLink to="/markets">{t('browseMarkets')}</ButtonLink>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card as="article" className="flex flex-col gap-2 p-4">
          <Link to="/orders" className="flex flex-col gap-2 text-inherit no-underline">
            <b className="text-[17px]">{t('cards.upcoming', { count: 4 })}</b>
            <span className="text-small text-ink-muted">
              {t('cards.upcomingBreakdown', { placed: 1, accepted: 2, ready: 1 })}
            </span>
          </Link>
        </Card>
        <Card as="article" className="flex flex-col gap-2 p-4">
          <Link to="/favorites" className="flex flex-col gap-2 text-inherit no-underline">
            <b className="text-[17px]">{t('cards.favorites', { count: 8 })}</b>
            <span className="text-small text-ink-muted">
              {[
                t('cards.stalls', { count: 3 }),
                t('cards.products', { count: 4 }),
                t('cards.markets', { count: 1 }),
              ].join(' · ')}
            </span>
          </Link>
        </Card>
        <Card as="article" className="flex flex-col gap-2 p-4">
          <Link to="/notifications" className="flex flex-col gap-2 text-inherit no-underline">
            <b className="text-[17px]">{t('cards.unread', { count: 2 })}</b>
            <span className="text-small text-ink-muted">{t('cards.unreadText')}</span>
          </Link>
        </Card>
        <Card as="article" className="flex flex-col gap-2 p-4">
          <Link to="/account" className="flex flex-col gap-2 text-inherit no-underline">
            <b className="text-[17px]">{t('cards.account')}</b>
            <span className="text-small text-ink-muted">Nguyễn Minh Khang · Thảo Điền</span>
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {nextPickups.map((o) => (
            <OrderTicket key={o.code} order={o} fluid />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-h2">{t('newFromFavorites')}</h2>
          <Link to="/favorites" className="text-brand underline">
            {t('favorites')}
          </Link>
        </div>
        <div className="grid gap-x-4 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
          {dashboardFavoriteProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default CustomerDashboardPage;
