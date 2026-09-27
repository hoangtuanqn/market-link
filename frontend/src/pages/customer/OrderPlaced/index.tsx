import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation } from 'react-router';
import OrderApi, { toOrder, type PlacedOrderDto } from '@/api-requests/order.requests';
import OrderTicket from '@/components/OrderTicket';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import { dayName, formatDayMonth, formatTime } from '@/lib/format';

/** FR-031 FR-032 — confirmation after placing pre-orders; stock is already held (D-02). */
const CustomerOrderPlacedPage = () => {
  const { t, i18n } = useTranslation('CustomerOrderPlaced');
  const { t: tc } = useTranslation();
  const { state: nav } = useLocation() as { state: { orders?: PlacedOrderDto[] } | null };
  const placed = nav?.orders ?? [];
  const { state } = useRequest(`placed:${placed.map((o) => o.orderId).join(',')}`, () =>
    Promise.all(placed.map((o) => OrderApi.get(o.orderId))),
  );
  // Fallback only: a freshly placed order always has a first status-history row. Captured once (not Date.now() at
  // render time) so the render stays pure (react-hooks/purity).
  const [openedAt] = useState(() => new Date());

  if (!placed.length) return <Navigate to="/orders" replace />;

  if (state.kind === 'loading') {
    return (
      <p role="status" className="text-ink-muted">
        {tc('notify.list.loading')}
      </p>
    );
  }

  if (state.kind === 'error') {
    return <LoadError noun={t('noun')} alt={<Link to="/orders">{t('seeOrders')}</Link>} />;
  }

  const placedOrders = state.data.map(toOrder);
  const list = (items: string[]) => new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(items);
  const stalls = list(placedOrders.map((o) => o.stallName ?? ''));
  const cutoffs = list(
    placedOrders.map((o) => {
      const at = new Date(o.cutoff);
      return t('steps.cutoffAt', { time: formatTime(at), date: formatDayMonth(at) });
    }),
  );
  const firstChange = state.data[0].statusHistory[0]?.changedAt;
  const PLACED_AT = firstChange ? new Date(firstChange) : openedAt;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-155 flex-col gap-2">
        <p className="font-hand text-hand text-ink-muted">
          {dayName(PLACED_AT.getDay(), 'long')} {formatDayMonth(PLACED_AT)} · {formatTime(PLACED_AT)}
        </p>
        <h1 className="text-h1">{t('title', { count: placedOrders.length })}</h1>
        <p className="text-body-lg">{t('intro')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {placedOrders.map((o) => (
          <OrderTicket key={o.code} order={o} fluid hideActions />
        ))}
      </div>

      <Card className="flex max-w-155 flex-col gap-3 p-6">
        <h2 className="text-h3">{t('steps.title')}</h2>
        <ol className="text-body m-0 flex list-decimal flex-col gap-1.5 pl-5">
          <li>{t('steps.review', { stalls })}</li>
          <li>{t('steps.edit', { cutoffs })}</li>
          <li>{t('steps.pickup')}</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/orders">{t('seeOrders')}</ButtonLink>
          <ButtonLink to="/products" variant="secondary">
            {t('keepBrowsing')}
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
};

export default CustomerOrderPlacedPage;
