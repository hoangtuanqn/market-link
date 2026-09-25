import { useState } from 'react';
import { Link, useParams } from 'react-router';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import OrderTicket from '@/components/OrderTicket';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ORDER_STATUS_META } from '@/constants/orderStatus';
import { farmer, farmerName, marketName, orderTotal, orders } from '@/data/customer';
import { vnd } from '@/lib/format';
import Helper from '@/utils/helper';
import { markets } from '@/data/home';
import type { OrderStatus } from '@/types/order.types';
import DirectionsButton from '@/components/DirectionsButton';

const STEPS: OrderStatus[] = ['placed', 'accepted', 'ready', 'completed'];

/** FR-033 FR-034 FR-035 FR-038 — order detail: ticket, pickup point, status history, and the change/cancel panel. */
const CustomerOrderDetailPage = () => {
  const { code } = useParams<{ code: string }>();
  const order = orders.find((o) => o.code.replace('#', '') === code);
  const [previewLocked, setPreviewLocked] = useState(false);

  if (!order) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">That order is not here any more</h1>
        <p className="text-ink-muted">You may have cancelled it, or the link is old. Open it again from your orders.</p>
        <ButtonLink to="/orders">My orders</ButtonLink>
      </div>
    );
  }

  const locked = previewLocked || order.locked;
  const effectiveOrder = { ...order, locked };
  const f = farmer(order.farmerId);
  /**
   * One pin: the stall you collect from (FR-013). Built on each render rather than memoised — it is a single fixed
   * point on a page that barely re-renders, and React Compiler rejects manual memoisation of anything derived from the
   * module-level order list.
   */
  const mapMarkers: MapMarker[] =
    f && f.lat != null && f.lng != null
      ? [
          {
            lat: f.lat,
            lng: f.lng,
            kind: 'stall',
            label: f.stall,
            selected: true,
            popup: { title: f.stall, lines: [`Stall ${f.stallCode} · pickup ${f.pickup}`] },
          },
        ]
      : [];
  const stepIndex = STEPS.indexOf(order.status);
  const [firstStep, lastStep] = [order.history[0], order.history[order.history.length - 1]];
  const editable = !locked && (order.status === 'placed' || order.status === 'accepted');

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/orders" className="text-brand underline">
          My orders
        </Link>{' '}
        · Order {order.code}
      </p>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">
            Placed {firstStep[1]} · {lastStep[0]} {lastStep[1]}
          </p>
          <h1 className="font-hand text-h1">
            {farmerName(order.farmerId)} · {order.date}, {order.slot}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {STEPS.map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true" className="border-line-strong w-6 border-t-2 border-dotted" />}
                <span
                  className={Helper.cn(
                    'inline-flex items-center gap-1.5 text-[14px]',
                    stepIndex >= i ? 'text-ink font-bold' : 'text-ink-muted',
                  )}
                >
                  {ORDER_STATUS_META[s].label}
                </span>
              </span>
            ))}
          </div>
        </div>
        <Chip pressed={previewLocked} onClick={() => setPreviewLocked((v) => !v)}>
          Preview: after cutoff
        </Chip>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-8">
          <OrderTicket order={effectiveOrder} fluid hideActions />

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">Pickup</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="flex flex-col gap-3 p-4">
                <h3 className="text-h3">
                  {marketName(order.marketId)}, stall {f?.stallCode}
                </h3>
                <p className="text-[15px]">
                  {markets.find((m) => m.id === order.marketId)?.address}. River side of the market, next to the bread
                  stall.
                </p>
                <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                  <dt className="text-ink-muted">Your slot</dt>
                  <dd className="m-0">
                    {order.date} · {order.slot}
                  </dd>
                  <dt className="text-ink-muted">Stall phone</dt>
                  <dd className="m-0">{f?.phone}</dd>
                  <dt className="text-ink-muted">Bring</dt>
                  <dd className="m-0">{vnd(orderTotal(order))} in cash or bank transfer at the stall</dd>
                </dl>
                <div className="flex flex-wrap gap-2">
                  {f && (
                    <DirectionsButton
                      to={{ lat: f.lat as number, lng: f.lng as number }}
                      name={f.stall}
                      variant="secondary"
                    />
                  )}
                  <ButtonLink to={`/stalls/${order.farmerId}`} variant="ghost" size="sm">
                    Stall page
                  </ButtonLink>
                </div>
              </Card>
              <MarketMap
                label={`Pickup point at stall ${f?.stallCode ?? ''}`}
                markers={mapMarkers}
                className="min-h-60"
                scrollWheelZoom={false}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">History</h2>
            <ol className="m-0 flex flex-col p-0">
              {order.history.map(([status, time, by], i) => (
                <li key={i} className="relative grid grid-cols-[28px_1fr] items-start gap-3 py-2">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="border-line-strong absolute top-[-8px] left-[13px] h-4 border-l-2 border-dotted"
                    />
                  )}
                  <span
                    className={Helper.cn(
                      'grid size-7 flex-none place-items-center rounded-full',
                      ORDER_STATUS_META[status].className,
                    )}
                  >
                    {(() => {
                      const Icon = ORDER_STATUS_META[status].icon;
                      return <Icon size={14} />;
                    })()}
                  </span>
                  <div>
                    <OrderStatusBadge status={status} />
                    <time className="text-ink-muted mt-0.5 block text-[13px]">
                      {time} · by {by}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-ink-muted text-[13px]">Every status change is recorded with who made it.</p>
          </section>
        </div>

        <aside className="sticky top-20 flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">Change this order</h2>
            {!locked && (
              <p className="text-[15px]">
                You can edit quantities, remove items or cancel until <b>{order.cutoff}</b>. After you edit,{' '}
                {farmerName(order.farmerId)} approves the order again.
              </p>
            )}
            <ButtonLink to={`/orders/${code}/edit`} variant="secondary" className="w-full" aria-disabled={!editable}>
              Edit order
            </ButtonLink>
            <Button variant="danger" className="w-full" disabled={locked}>
              Cancel order
            </Button>
            {locked && (
              <p className="text-ink-muted text-[13px]">
                Cutoff passed at {order.cutoff}. To change it, contact the stall directly on {f?.phone}.
              </p>
            )}
          </Card>
          <Card className="flex flex-col gap-2 p-6">
            <h2 className="text-h3">Notifications for this order</h2>
            <p className="text-[15px]">
              You were told when it was accepted. You will be told when it is ready, or if the stall has to decline it.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default CustomerOrderDetailPage;
