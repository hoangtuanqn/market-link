import { useState } from 'react';
import OrderTicket from '@/components/OrderTicket';
import { SelectField } from '@/components/ui/input';
import Tabs from '@/components/ui/tabs';
import { farmerName, orders } from '@/data/customer';

const STALLS = ['All stalls', 'Cô Tư Garden', 'Út Hiền Orchard', 'Gió Nam Bakery', 'Củ Chi Goat Farm', 'Ba Lành Farm'];

const UPCOMING_STATUSES = new Set(['placed', 'accepted', 'ready']);
const PAST_STATUSES = new Set(['completed', 'declined', 'cancelled']);

/** FR-033 FR-036 FR-037 — orders grouped Upcoming / Past / All, filterable by stall. */
const CustomerOrdersPage = () => {
  const [tab, setTab] = useState<'up' | 'past' | 'all'>('up');
  const [stall, setStall] = useState('All stalls');

  const byStall = (list: typeof orders) =>
    stall === 'All stalls' ? list : list.filter((o) => farmerName(o.farmerId) === stall);

  const upcoming = byStall(orders.filter((o) => UPCOMING_STATUSES.has(o.status)));
  const past = byStall(orders.filter((o) => PAST_STATUSES.has(o.status)));
  const all = byStall(orders);
  const shown = tab === 'up' ? upcoming : tab === 'past' ? past : all;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">My orders</h1>
          <p className="text-body-lg max-w-155">
            Upcoming pickups first. Past orders keep their receipts, and you can reorder anything you bought before at
            today&apos;s price and stock.
          </p>
        </div>
        <SelectField
          id="stall-f"
          label="Stall"
          options={STALLS}
          value={stall}
          onChange={(e) => setStall(e.target.value)}
          className="min-w-55"
        />
      </div>

      <div className="flex flex-col gap-4">
        <Tabs
          label="Orders"
          value={tab}
          onChange={(id) => setTab(id as typeof tab)}
          tabs={[
            { id: 'up', label: 'Upcoming', count: upcoming.length },
            { id: 'past', label: 'Past', count: past.length },
            { id: 'all', label: 'All', count: all.length },
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
