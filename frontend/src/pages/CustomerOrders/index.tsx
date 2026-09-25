import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import OrderTicket from '@/components/OrderTicket';
import { SelectField } from '@/components/ui/input';
import Tabs from '@/components/ui/tabs';
import { farmerName, orders } from '@/data/customer';

/** Tên sạp là dữ liệu (không dịch); '' = tất cả sạp, nhãn dịch lúc render. */
const STALLS = ['Cô Tư Garden', 'Út Hiền Orchard', 'Gió Nam Bakery', 'Củ Chi Goat Farm', 'Ba Lành Farm'];

const UPCOMING_STATUSES = new Set(['placed', 'accepted', 'ready']);
const PAST_STATUSES = new Set(['completed', 'declined', 'cancelled']);

/** FR-033 FR-036 FR-037 — orders grouped Upcoming / Past / All, filterable by stall. */
const CustomerOrdersPage = () => {
  const { t } = useTranslation('CustomerOrders');
  const [tab, setTab] = useState<'up' | 'past' | 'all'>('up');
  const [stall, setStall] = useState('');

  const byStall = (list: typeof orders) => (stall === '' ? list : list.filter((o) => farmerName(o.farmerId) === stall));

  const upcoming = byStall(orders.filter((o) => UPCOMING_STATUSES.has(o.status)));
  const past = byStall(orders.filter((o) => PAST_STATUSES.has(o.status)));
  const all = byStall(orders);
  const shown = tab === 'up' ? upcoming : tab === 'past' ? past : all;

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
          options={[{ value: '', label: t('allStalls') }, ...STALLS.map((s) => ({ value: s, label: s }))]}
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
            { id: 'all', label: t('tabs.all'), count: all.length },
          ]}
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((o) => (
            <OrderTicket key={o.code} order={o} fluid />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerOrdersPage;
