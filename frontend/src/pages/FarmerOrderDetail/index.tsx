import { useState } from 'react';
import { Link, useParams } from 'react-router';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Table, type TableColumn } from '@/components/ui/table';
import { farmer, marketName, product } from '@/data/catalog';
import { farmerOrderTotal, farmerOrders, type FarmerOrderLine } from '@/data/farmer';
import { units, vnd } from '@/lib/format';
import type { OrderStatus } from '@/types/order.types';
import Notification from '@/utils/notification';

const STEP_PIPELINE: OrderStatus[] = ['placed', 'accepted', 'ready', 'completed'];
const DECLINE_REASONS = ['Not enough stock', 'Not selling on that day', 'Cannot make that pickup time', 'Other'];

/**
 * What we actually know about each step: no per-event timestamp exists for these seeded orders (only the prototype's
 * single demo order had one), so this notes the cutoff instead of inventing exact clock times.
 */
function historySteps(status: OrderStatus, cutoff: string, reason?: string) {
  if (status === 'declined')
    return [
      { status: 'placed' as const, note: `Before ${cutoff}` },
      { status, note: reason },
    ];
  if (status === 'cancelled')
    return [
      { status: 'placed' as const, note: `Before ${cutoff}` },
      { status, note: 'Cancelled by the customer' },
    ];
  const idx = STEP_PIPELINE.indexOf(status);
  return STEP_PIPELINE.slice(0, idx + 1).map((s, i) => ({ status: s, note: i === 0 ? `Before ${cutoff}` : undefined }));
}

/** FR-065 FR-066 FR-038 — Farmer's view of one order: items, customer, pickup slot and status history. */
const FarmerOrderDetailPage = () => {
  const { code } = useParams<{ code: string }>();
  const seeded = farmerOrders.find((o) => o.code.replace('#', '') === code);
  const [status, setStatus] = useState<OrderStatus | null>(seeded?.status ?? null);
  const [dialog, setDialog] = useState<'decline' | 'complete' | null>(null);
  const [reason, setReason] = useState(DECLINE_REASONS[0]);

  if (!seeded || status === null) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">That order is not here any more</h1>
        <p className="text-ink-muted">
          It may have been cancelled by the customer, or the link is old. Open it again from your orders list.
        </p>
        <ButtonLink to="/farmer/orders">My orders</ButtonLink>
      </div>
    );
  }

  const order = { ...seeded, status };
  const f = farmer(1)!;
  const total = farmerOrderTotal(order);
  const itemsText = order.items
    .map((i) => {
      const p = product(i.productId);
      return `${units(i.qty, p?.unit, p?.plural)} of ${p?.name ?? 'item'}`;
    })
    .join(', ');
  const sameCustomer = farmerOrders.filter((o) => o.who === order.who);
  const completedWithCustomer = sameCustomer.filter((o) => o.status === 'completed').length;

  const columns: TableColumn<FarmerOrderLine>[] = [
    {
      key: 'n',
      label: 'Product',
      render: (i) => {
        const p = product(i.productId);
        return (
          <>
            {p?.name}
            <span className="text-ink-muted mt-0.5 block text-[13px] font-normal">
              {p ? vnd(p.price) : ''} / {p?.unit}
            </span>
          </>
        );
      },
    },
    {
      key: 'q',
      label: 'Requested',
      align: 'num',
      render: (i) => units(i.qty, product(i.productId)?.unit, product(i.productId)?.plural),
    },
    { key: 's', label: 'Left after this order', align: 'num', render: (i) => product(i.productId)?.stock ?? 0 },
    { key: 't', label: 'Amount', align: 'num', render: (i) => vnd(i.qty * (product(i.productId)?.price ?? 0)) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/farmer/orders" className="text-brand underline">
          Orders
        </Link>{' '}
        · {order.code}
      </p>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">Cutoff {order.cutoff}</p>
          <h1 className="font-hand text-h1">
            {order.code} · {order.who} · {order.date}, {order.slot}
          </h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {order.status === 'placed' && (
            <>
              <Button
                onClick={() => {
                  setStatus('accepted');
                  Notification.success({
                    title: 'Order accepted',
                    text: `Order ${order.code} accepted. ${order.who} has been told.`,
                  });
                }}
              >
                Accept order
              </Button>
              <Button variant="danger" onClick={() => setDialog('decline')}>
                Decline
              </Button>
            </>
          )}
          {order.status === 'accepted' && (
            <Button
              variant="secondary"
              onClick={() => {
                setStatus('ready');
                Notification.success({ title: 'Order ready', text: `Order ${order.code} marked ready.` });
              }}
            >
              Mark ready
            </Button>
          )}
          {order.status === 'ready' && <Button onClick={() => setDialog('complete')}>Mark completed</Button>}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="text-h2">Items</h2>
            <Table columns={columns} rows={order.items} />
            <p className="text-small text-ink-muted">
              Stock shown is what is left after this and other placed orders. Reserved stock is returned if you decline
              (D-02).
            </p>
          </section>

          {order.note && (
            <section className="flex flex-col gap-3">
              <h2 className="text-h2">Note from the customer</h2>
              <Card className="p-4 text-[16px]">“{order.note}”</Card>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">History</h2>
            <ol className="m-0 flex flex-col p-0">
              {historySteps(order.status, order.cutoff, order.reason).map((h, i) => (
                <li key={i} className="relative grid grid-cols-[28px_1fr] items-start gap-3 py-2">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="border-line-strong absolute top-[-8px] left-[13px] h-4 border-l-2 border-dotted"
                    />
                  )}
                  <span className="bg-surface-sunken grid size-7 flex-none place-items-center rounded-full" />
                  <div>
                    <OrderStatusBadge status={h.status} />
                    {h.note && <p className="text-ink-muted mt-0.5 text-[13px]">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">Customer</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">Name</dt>
              <dd className="m-0">{order.who}</dd>
              <dt className="text-ink-muted">Phone</dt>
              <dd className="m-0">{order.phone}</dd>
              <dt className="text-ink-muted">Orders with you</dt>
              <dd className="m-0">
                {sameCustomer.length} order{sameCustomer.length === 1 ? '' : 's'}
                {completedWithCustomer ? `, ${completedWithCustomer} collected` : ''}
              </dd>
            </dl>
          </Card>
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">Pickup slot</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">Market</dt>
              <dd className="m-0">
                {marketName(1)}, stall {f.stallCode}
              </dd>
              <dt className="text-ink-muted">Slot</dt>
              <dd className="m-0">
                {order.date} · {order.slot}
              </dd>
              <dt className="text-ink-muted">Pay on pickup</dt>
              <dd className="text-price m-0">{vnd(total)}</dd>
            </dl>
          </Card>
        </aside>
      </div>

      <Dialog
        open={dialog === 'decline'}
        title={`Decline order ${order.code}?`}
        tone="danger"
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Keep order
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setStatus('declined');
                setDialog(null);
                Notification.success({ title: 'Order declined', text: `Order ${order.code} declined.` });
              }}
            >
              Decline order
            </Button>
          </>
        }
      >
        <p>
          {order.who} is told right away and {itemsText} go back to your stock.
        </p>
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
        open={dialog === 'complete'}
        title={`Mark ${order.code} as completed?`}
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Not yet
            </Button>
            <Button
              onClick={() => {
                setStatus('completed');
                setDialog(null);
                Notification.success({ title: 'Order completed', text: `Order ${order.code} completed.` });
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

export default FarmerOrderDetailPage;
