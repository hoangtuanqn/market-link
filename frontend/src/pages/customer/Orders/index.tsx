import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import OrderApi, { toOrderCard } from '@/api-requests/order.requests';
import OrderTicket from '@/components/OrderTicket';
import { ButtonLink } from '@/components/ui/button';
import { DataState, LoadError } from '@/components/ui/data-state';
import { SelectField } from '@/components/ui/input';
import Tabs from '@/components/ui/tabs';
import useRequest from '@/hooks/useRequest';
import type { OrderType } from '@/types/order.types';

const UPCOMING_STATUSES = new Set(['placed', 'accepted', 'ready']);
const PAST_STATUSES = new Set(['completed', 'declined', 'cancelled']);

/** FR-033 FR-036 FR-037 — orders grouped Upcoming / Past / All, filterable by stall. */
const CustomerOrdersPage = () => {
  const { t } = useTranslation('CustomerOrders');
  const { t: tc } = useTranslation();
  const [tab, setTab] = useState<'up' | 'past' | 'all'>('up');
  const [stall, setStall] = useState('');

  const { state, retry, mutate } = useRequest('my-orders', () => OrderApi.list({ pageSize: 50 }));
  const all = state.kind === 'ready' ? state.data.items.map(toOrderCard) : [];
  const stalls = [...new Set(all.map((o) => o.stallName ?? ''))].filter(Boolean);
  const byStall = (list: OrderType[]) => (stall === '' ? list : list.filter((o) => o.stallName === stall));
  const onChanged = (updated: OrderType) =>
    mutate((page) => ({
      ...page,
      items: page.items.map((i) => (i.orderId === updated.id ? { ...i, status: updated.status } : i)),
    }));

  const upcoming = byStall(all.filter((o) => UPCOMING_STATUSES.has(o.status)));
  const past = byStall(all.filter((o) => PAST_STATUSES.has(o.status)));
  const allOrders = byStall(all);
  const shown = tab === 'up' ? upcoming : tab === 'past' ? past : allOrders;

  if (state.kind === 'loading') {
    return (
      <p role="status" className="text-ink-muted">
        {tc('notify.list.loading')}
      </p>
    );
  }

  if (state.kind === 'error') {
    return <LoadError noun={t('noun')} onRetry={retry} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body-lg max-w-155">{t('intro')}</p>
        </div>
        <SelectField
          id="stall-f"
          label={t('stall')}
          options={[{ value: '', label: t('allStalls') }, ...stalls.map((s) => ({ value: s, label: s }))]}
          value={stall}
          onChange={(e) => setStall(e.target.value)}
          className="min-w-55"
        />
      </div>

      <div className="flex flex-col gap-4">
        <Tabs
          label={t('tabs.label')}
          value={tab}
          onChange={(id) => setTab(id as typeof tab)}
          tabs={[
            { id: 'up', label: t('tabs.upcoming'), count: upcoming.length },
            { id: 'past', label: t('tabs.past'), count: past.length },
            { id: 'all', label: t('tabs.all'), count: allOrders.length },
          ]}
        />
        {shown.length === 0 ? (
          <DataState
            fill
            title={t(`empty.${tab}.title`)}
            text={t(`empty.${tab}.text`)}
            action={<ButtonLink to="/products">{t('empty.cta')}</ButtonLink>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((o) => (
              <OrderTicket key={o.code} order={o} fluid onChanged={onChanged} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerOrdersPage;
