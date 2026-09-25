import { useState } from 'react';
import { Banner } from '@/components/ui/banner';
import { BarList } from '@/components/ui/bar-list';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Kpi } from '@/components/ui/kpi';
import { Pagination } from '@/components/ui/pagination';
import { StockList } from '@/components/ui/stock-list';
import { Table, type TableColumn } from '@/components/ui/table';
import Tabs from '@/components/ui/tabs';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { marketName } from '@/data/catalog';
import {
  bestSellers,
  farmerOrderTotal,
  farmerOrders,
  overviewSpark,
  stockForSaturday,
  type FarmerOrderType,
} from '@/data/farmer';
import { vnd } from '@/lib/format';
import type { OrderStatus } from '@/types/order.types';
import Notification from '@/utils/notification';
import LiveClock from './LiveClock';

const TABS = [
  { id: 'new', label: 'Awaiting approval', status: 'placed' as OrderStatus },
  { id: 'acc', label: 'Accepted', status: 'accepted' as OrderStatus },
  { id: 'ready', label: 'Ready', status: 'ready' as OrderStatus },
  { id: 'done', label: 'Completed', status: 'completed' as OrderStatus },
];

const DECLINE_REASONS = ['Not enough stock', 'Not selling on that day', 'Cannot make that pickup time', 'Other'];

/** FR-065 FR-068 FR-069 — Farmer dashboard: KPIs, incoming orders, stock for Saturday and best sellers. */
const FarmerOverviewPage = () => {
  const [tab, setTab] = useState<'new' | 'acc' | 'ready' | 'done'>('new');
  const [declineCode, setDeclineCode] = useState<string | null>(null);
  const [reason, setReason] = useState(DECLINE_REASONS[0]);

  const by = (status: OrderStatus) => farmerOrders.filter((o) => o.status === status);
  const awaiting = by('placed');

  const columns: TableColumn<FarmerOrderType>[] = [
    { key: 'code', label: 'Order' },
    {
      key: 'who',
      label: 'Customer',
      render: (r) => (
        <>
          {r.who}
          <span className="text-ink-muted mt-0.5 block text-[13px] font-normal">{r.phone}</span>
        </>
      ),
    },
    { key: 'slot', label: 'Pickup', render: (r) => `${r.date} · ${r.slot}` },
    { key: 'items', label: 'Items', align: 'num', render: (r) => r.items.length },
    { key: 'total', label: 'Total', align: 'num', render: (r) => vnd(farmerOrderTotal(r)) },
    { key: 'st', label: 'Status', render: (r) => <OrderStatusBadge status={r.status} /> },
    {
      key: 'a',
      label: '',
      align: 'actions',
      render: (r) => {
        if (r.status === 'placed')
          return (
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                onClick={() =>
                  Notification.success({
                    title: 'Order accepted',
                    text: `Order ${r.code} accepted. ${r.who} has been told.`,
                  })
                }
              >
                Accept
              </Button>
              <Button variant="danger" size="sm" onClick={() => setDeclineCode(r.code)}>
                Decline
              </Button>
            </div>
          );
        if (r.status === 'accepted')
          return (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => Notification.success({ title: 'Order ready', text: `Order ${r.code} marked ready.` })}
            >
              Mark ready
            </Button>
          );
        if (r.status === 'ready')
          return (
            <Button
              size="sm"
              onClick={() => Notification.success({ title: 'Order completed', text: `Order ${r.code} completed.` })}
            >
              Mark completed
            </Button>
          );
        return (
          <ButtonLink variant="ghost" size="sm" to={`/farmer/orders/${r.code.replace('#', '')}`}>
            View
          </ButtonLink>
        );
      },
    },
  ];

  const activeTab = TABS.find((t) => t.id === tab)!;
  const rows = by(activeTab.status);
  const captions: Record<typeof tab, string> = {
    new: 'Awaiting approval · Sat 26/09 and Sun 27/09',
    acc: 'Accepted',
    ready: 'Ready for pickup',
    done: 'Completed',
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-overline text-ink-muted m-0">
            <LiveClock /> · your stall at {marketName(1)} · next market day Sat 26/09
          </p>
          <h1 className="font-hand text-h1">Morning, Cô Tư</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink variant="secondary" to="/farmer/stock">
            Apply weekly template
          </ButtonLink>
          <ButtonLink to="/farmer/products/new">Add product</ButtonLink>
        </div>
      </div>

      <Banner variant="warning" title="4 orders are waiting for you. 3 of them close at 19:00 tomorrow.">
        Unapproved orders still hold stock. Accept or decline before the cutoff so customers can plan.
      </Banner>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi
          label="Total orders"
          value="128"
          note="23 this week"
          delta={{ pct: 18.9, vs: 'vs August' }}
          spark={overviewSpark.orders}
          href="/farmer/history"
          linkLabel="Open sales history"
        />
        <Kpi
          label="Awaiting approval"
          value={awaiting.length}
          note={
            <>
              <b>3</b> close at 19:00 on 25/09
            </>
          }
          delta={{ pct: 33.3, good: false, vs: 'vs a normal Thursday' }}
          highlight
          href="/farmer/orders"
          linkLabel="Open incoming orders"
        />
        <Kpi
          label="September revenue"
          value="8,450,000"
          note="₫, from completed orders, paid at the stall"
          delta={{ pct: 21.4, vs: 'vs August' }}
          spark={overviewSpark.revenue}
          href="/farmer/history"
          linkLabel="Open sales history"
        />
        <Kpi
          label="Best seller"
          value="Water spinach"
          note="64 bunches this month"
          delta={{ pct: 11.2, vs: 'vs August' }}
          href="/farmer/products"
          linkLabel="Open products"
        />
      </div>
      <p className="text-small text-ink-muted -mt-2">
        September so far, next to August. Every tile opens the screen behind its number.
      </p>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h2">Incoming orders</h2>
          <ButtonLink variant="ghost" to="/farmer/orders">
            All orders and filters
          </ButtonLink>
        </div>
        <Tabs
          label="Incoming orders"
          value={tab}
          onChange={(id) => setTab(id as typeof tab)}
          tabs={TABS.map((t) => ({
            id: t.id,
            label: t.label,
            count: t.id === 'done' ? undefined : by(t.status).length,
          }))}
        />
        <Table
          caption={captions[tab]}
          columns={columns}
          rows={rows}
          rowClassName={(r) => (r.isNew ? '!bg-highlight' : undefined)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-small text-ink-muted">New orders are highlighted until you open them.</span>
          <Pagination page={1} pages={1} onChange={() => {}} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h3">Stock for Saturday</h2>
            <ButtonLink variant="ghost" size="sm" to="/farmer/stock">
              This week's stock
            </ButtonLink>
          </div>
          <StockList rows={stockForSaturday} />
          <p className="text-small text-ink-muted">
            Reserved means an order is holding it. Those come off your count the moment a customer orders.
          </p>
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h3">Best sellers</h2>
            <ButtonLink variant="ghost" size="sm" to="/farmer/history">
              Sales history
            </ButtonLink>
          </div>
          <p className="text-small text-ink-muted -mt-1">Sold in September, each in its own unit</p>
          <BarList rows={bestSellers} />
        </Card>
      </section>

      <p className="text-caption text-ink-muted">The sidebar and the header above it are new to the prototype.</p>

      {declineCode && (
        <Dialog
          title={`Decline order ${declineCode}?`}
          tone="danger"
          keepLabel="Keep order"
          confirmLabel="Decline order"
          onClose={() => setDeclineCode(null)}
          onConfirm={() => {
            Notification.success({
              title: 'Order declined',
              text: `Order ${declineCode} declined. Stock is back in your count.`,
            });
            setDeclineCode(null);
          }}
        >
          <p>The customer is told right away and the items go back to your stock.</p>
          <label className="text-ink-muted mt-2 block text-[13px] font-bold" htmlFor="decline-reason">
            Reason the customer will see
          </label>
          <select
            id="decline-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="border-line-strong bg-surface-raised text-body mt-1 min-h-11 w-full rounded-sm border-[1.5px] px-3"
          >
            {DECLINE_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Dialog>
      )}
    </div>
  );
};

export default FarmerOverviewPage;
