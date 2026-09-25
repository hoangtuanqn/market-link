import { useState } from 'react';
import { Link } from 'react-router';
import DayChips from '@/components/DayChips';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { Button, ButtonLink } from '@/components/ui/button';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, type TableColumn } from '@/components/ui/table';
import Tabs from '@/components/ui/tabs';
import { farmerOrders, farmerOrderTotal, type FarmerOrderType } from '@/data/farmer';
import { vnd } from '@/lib/format';
import type { OrderStatus } from '@/types/order.types';
import Notification from '@/utils/notification';

const STATUSES: OrderStatus[] = ['placed', 'accepted', 'ready', 'completed', 'declined', 'cancelled'];

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Awaiting approval',
  accepted: 'Accepted',
  ready: 'Ready',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

const EMPTY: Record<OrderStatus, [string, string]> = {
  placed: ['Nothing waiting for you', 'New pre-orders land here until 12 hours before their slot.'],
  accepted: ['No accepted orders', 'Orders you accept wait here until you mark them ready.'],
  ready: ['Nothing ready yet', 'Mark an accepted order ready once it is packed for the stall.'],
  completed: ['No completed orders', 'An order completes when the customer collects and pays at the stall.'],
  declined: ['No declined orders', 'Orders you turn down are listed here with the reason.'],
  cancelled: ['No cancelled orders', 'Customers can cancel until the cutoff (D-05).'],
};

const DAY_OPTIONS = [
  { value: 'all', label: 'All', sub: 'days' },
  { value: 'fri', label: 'Fri', sub: '25/09' },
  { value: 'sat', label: 'Sat', sub: '26/09' },
  { value: 'sun', label: 'Sun', sub: '27/09' },
];
const DAY_PREFIX: Record<string, string> = { fri: 'Fri', sat: 'Sat', sun: 'Sun' };

const DECLINE_REASONS = ['Not enough stock', 'Not selling on that day', 'Cannot make that pickup time', 'Other'];

type ConfirmDialog = { kind: 'decline' | 'complete'; code: string } | null;

/**
 * FR-065 FR-066 — Incoming orders: accept, decline, mark ready and complete, one status move at a time (D-04). Nothing
 * is stored here: a reload gives the seeded orders back, matching the prototype.
 */
const FarmerOrdersPage = () => {
  const [rows, setRows] = useState<FarmerOrderType[]>(farmerOrders);
  const [tab, setTab] = useState<OrderStatus>('placed');
  const [day, setDay] = useState('all');
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState<ConfirmDialog>(null);
  const [reason, setReason] = useState(DECLINE_REASONS[0]);

  const move = (code: string, to: OrderStatus, message: string) => {
    setRows((prev) => prev.map((o) => (o.code === code ? { ...o, status: to, isNew: false } : o)));
    Notification.success({ text: message });
  };

  const qLower = q.trim().toLowerCase();
  const filtered = rows.filter((o) => {
    if (day !== 'all' && !o.date.startsWith(DAY_PREFIX[day])) return false;
    if (qLower && !o.code.toLowerCase().includes(qLower) && !o.who.toLowerCase().includes(qLower)) return false;
    return true;
  });
  const by = (status: OrderStatus) => filtered.filter((o) => o.status === status);

  const columns: TableColumn<FarmerOrderType>[] = [
    {
      key: 'code',
      label: 'Order',
      render: (r) => <Link to={`/farmer/orders/${r.code.replace('#', '')}`}>{r.code}</Link>,
    },
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
    { key: 'cut', label: 'Cutoff', render: (r) => r.cutoff },
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
              <Button size="sm" onClick={() => move(r.code, 'accepted', `Order ${r.code} accepted.`)}>
                Accept
              </Button>
              <Button variant="danger" size="sm" onClick={() => setConfirm({ kind: 'decline', code: r.code })}>
                Decline
              </Button>
            </div>
          );
        if (r.status === 'accepted')
          return (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => move(r.code, 'ready', `Order ${r.code} marked ready.`)}
            >
              Mark ready
            </Button>
          );
        if (r.status === 'ready')
          return (
            <Button size="sm" onClick={() => setConfirm({ kind: 'complete', code: r.code })}>
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

  const activeRows = by(tab);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">Orders</h1>
          <p className="text-body max-w-160">
            Accept or decline new orders before their cutoff, mark them ready on market day, and complete them when the
            customer has paid.
          </p>
        </div>
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="border-line-strong bg-surface-raised focus-within:outline-focus flex w-full max-w-105 items-stretch overflow-hidden rounded-sm border-[1.5px] focus-within:outline-2 focus-within:outline-offset-1 [&_button]:rounded-none"
        >
          <label htmlFor="order-q" className="sr-only">
            Search orders
          </label>
          <input
            id="order-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Order code or customer name"
            className="text-body min-w-0 flex-1 bg-transparent px-3 outline-none"
          />
          <Button type="submit">Search</Button>
        </form>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <DayChips legend="Pickup day" name="pickup-day" options={DAY_OPTIONS} value={day} onChange={setDay} />
        <SelectField
          id="mk"
          label="Market"
          options={['Both markets', 'Thảo Điền Weekend Market', 'Thủ Đức Farmers Market']}
        />
      </div>

      <div className="flex flex-col gap-4">
        <Tabs
          label="Orders by status"
          value={tab}
          onChange={(id) => setTab(id as OrderStatus)}
          tabs={STATUSES.map((s) => ({ id: s, label: STATUS_LABEL[s], count: by(s).length }))}
        />
        {activeRows.length ? (
          <Table columns={columns} rows={activeRows} rowClassName={(r) => (r.isNew ? '!bg-highlight' : undefined)} />
        ) : (
          <DataState title={EMPTY[tab][0]} text={EMPTY[tab][1]} />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-small text-ink-muted">
            Status changes are recorded with the time and who made them (FR-038). A change in the wrong order is refused
            (D-04).
          </span>
          <Pagination page={1} pages={1} onChange={() => {}} />
        </div>
      </div>

      <Dialog
        open={confirm?.kind === 'decline'}
        title={`Decline order ${confirm?.code ?? ''}?`}
        tone="danger"
        onClose={() => setConfirm(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Keep order
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm) move(confirm.code, 'declined', `Order ${confirm.code} declined.`);
                setConfirm(null);
              }}
            >
              Decline order
            </Button>
          </>
        }
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

      <Dialog
        open={confirm?.kind === 'complete'}
        title={`Mark ${confirm?.code ?? ''} as completed?`}
        onClose={() => setConfirm(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Not yet
            </Button>
            <Button
              onClick={() => {
                if (confirm) move(confirm.code, 'completed', `Order ${confirm.code} completed.`);
                setConfirm(null);
              }}
            >
              Mark completed
            </Button>
          </>
        }
      >
        <p>
          Do this after the customer has collected the order and paid at the stall. Completed orders count towards your
          revenue and unlock the customer&apos;s review.
        </p>
        <p className="text-ink-muted text-[14px]">
          Orders still marked Ready are completed automatically 24 hours after the pickup date (D-03).
        </p>
      </Dialog>
    </div>
  );
};

export default FarmerOrdersPage;
