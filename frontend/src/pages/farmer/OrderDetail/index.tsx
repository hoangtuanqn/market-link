import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Table, type TableColumn } from '@/components/ui/table';
import { farmer, marketName, product } from '@/data/catalog';
import { farmerOrderTotal, farmerOrders, type FarmerOrderLine } from '@/data/farmer';
import { perUnit, units, vnd } from '@/lib/format';
import type { OrderStatus } from '@/types/order.types';
import Notification from '@/utils/notification';
import TierBadge from '@/components/TierBadge';
import { demoTierOf } from '@/data/tiers';

const STEP_PIPELINE: OrderStatus[] = ['placed', 'accepted', 'ready', 'completed'];
const DECLINE_REASONS = [
  'decline.reasons.stock',
  'decline.reasons.day',
  'decline.reasons.time',
  'decline.reasons.other',
] as const;

/**
 * What we actually know about each step: no per-event timestamp exists for these seeded orders (only the prototype's
 * single demo order had one), so this notes the cutoff instead of inventing exact clock times.
 */
function historySteps(t: TFunction<'FarmerOrderDetail'>, status: OrderStatus, cutoff: string, reason?: string) {
  const before = t('history.before', { cutoff });
  if (status === 'declined')
    return [
      { status: 'placed' as const, note: before },
      { status, note: reason },
    ];
  if (status === 'cancelled')
    return [
      { status: 'placed' as const, note: before },
      { status, note: t('history.cancelled') },
    ];
  const idx = STEP_PIPELINE.indexOf(status);
  return STEP_PIPELINE.slice(0, idx + 1).map((s, i) => ({ status: s, note: i === 0 ? before : undefined }));
}

/** FR-065 FR-066 FR-038 — Farmer's view of one order: items, customer, pickup slot and status history. */
const FarmerOrderDetailPage = () => {
  const { t, i18n } = useTranslation('FarmerOrderDetail');
  const { code } = useParams<{ code: string }>();
  const seeded = farmerOrders.find((o) => o.code.replace('#', '') === code);
  const [status, setStatus] = useState<OrderStatus | null>(seeded?.status ?? null);
  const [dialog, setDialog] = useState<'decline' | 'complete' | null>(null);
  const [reason, setReason] = useState<string>(DECLINE_REASONS[0]);

  if (!seeded || status === null) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('missing.title')}</h1>
        <p className="text-ink-muted">{t('missing.text')}</p>
        <ButtonLink to="/farmer/orders">{t('missing.back')}</ButtonLink>
      </div>
    );
  }

  const order = { ...seeded, status };
  const f = farmer(1)!;
  const total = farmerOrderTotal(order);
  const itemsText = new Intl.ListFormat(i18n.language, { style: 'short', type: 'unit' }).format(
    order.items.map((i) => {
      const p = product(i.productId);
      return t('decline.item', { qty: units(i.qty, p?.unit, p?.plural), name: p?.name ?? t('item') });
    }),
  );
  const sameCustomer = farmerOrders.filter((o) => o.who === order.who);
  const completedWithCustomer = sameCustomer.filter((o) => o.status === 'completed').length;

  const columns: TableColumn<FarmerOrderLine>[] = [
    {
      key: 'n',
      label: t('col.product'),
      render: (i) => {
        const p = product(i.productId);
        return (
          <>
            {p?.name}
            <span className="text-ink-muted mt-0.5 block text-[13px] font-normal">
              {p ? perUnit(p.price, p.unit) : ''}
            </span>
          </>
        );
      },
    },
    {
      key: 'q',
      label: t('col.requested'),
      align: 'num',
      render: (i) => units(i.qty, product(i.productId)?.unit, product(i.productId)?.plural),
    },
    { key: 's', label: t('col.left'), align: 'num', render: (i) => product(i.productId)?.stock ?? 0 },
    { key: 't', label: t('col.amount'), align: 'num', render: (i) => vnd(i.qty * (product(i.productId)?.price ?? 0)) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/farmer/orders" className="text-brand underline">
          {t('crumb')}
        </Link>{' '}
        · {order.code}
      </p>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">{t('cutoff', { cutoff: order.cutoff })}</p>
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
                    title: t('toast.acceptedTitle'),
                    text: t('toast.acceptedText', { code: order.code, who: order.who }),
                  });
                }}
              >
                {t('actions.accept')}
              </Button>
              <Button variant="danger" onClick={() => setDialog('decline')}>
                {t('actions.decline')}
              </Button>
            </>
          )}
          {order.status === 'accepted' && (
            <Button
              variant="secondary"
              onClick={() => {
                setStatus('ready');
                Notification.success({
                  title: t('toast.readyTitle'),
                  text: t('toast.readyText', { code: order.code }),
                });
              }}
            >
              {t('actions.ready')}
            </Button>
          )}
          {order.status === 'ready' && <Button onClick={() => setDialog('complete')}>{t('actions.complete')}</Button>}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('items.title')}</h2>
            <Table columns={columns} rows={order.items} />
            <p className="text-small text-ink-muted">{t('items.note')}</p>
          </section>

          {order.note && (
            <section className="flex flex-col gap-3">
              <h2 className="text-h2">{t('note')}</h2>
              <Card className="p-4 text-[16px]">{t('quote', { text: order.note })}</Card>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('history.title')}</h2>
            <ol className="m-0 flex flex-col p-0">
              {historySteps(t, order.status, order.cutoff, order.reason).map((h, i) => (
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
            <h2 className="text-h3">{t('customer.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('customer.name')}</dt>
              <dd className="m-0">{order.who}</dd>
              {demoTierOf(order.who) && (
                <>
                  <dt className="text-ink-muted">{t('customer.tier')}</dt>
                  <dd className="m-0">
                    <TierBadge tier={demoTierOf(order.who)!} />
                  </dd>
                </>
              )}
              <dt className="text-ink-muted">{t('customer.phone')}</dt>
              <dd className="m-0">{order.phone}</dd>
              <dt className="text-ink-muted">{t('customer.ordersWithYou')}</dt>
              <dd className="m-0">
                {completedWithCustomer
                  ? t('customer.withCollected', {
                      orders: t('customer.orders', { count: sameCustomer.length }),
                      count: completedWithCustomer,
                    })
                  : t('customer.orders', { count: sameCustomer.length })}
              </dd>
            </dl>
          </Card>
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('pickup.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('pickup.market')}</dt>
              <dd className="m-0">{t('pickup.marketStall', { market: marketName(1), code: f.stallCode })}</dd>
              <dt className="text-ink-muted">{t('pickup.slot')}</dt>
              <dd className="m-0">
                {order.date} · {order.slot}
              </dd>
              <dt className="text-ink-muted">{t('pickup.pay')}</dt>
              <dd className="text-price m-0">{vnd(total)}</dd>
            </dl>
          </Card>
        </aside>
      </div>

      <Dialog
        open={dialog === 'decline'}
        title={t('decline.title', { code: order.code })}
        tone="danger"
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              {t('decline.keep')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setStatus('declined');
                setDialog(null);
                Notification.success({
                  title: t('toast.declinedTitle'),
                  text: t('toast.declinedText', { code: order.code }),
                });
              }}
            >
              {t('decline.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('decline.text', { who: order.who, items: itemsText })}</p>
        <label className="text-ink-muted mt-2 block text-[13px] font-bold" htmlFor="decline-reason">
          {t('decline.reason')}
        </label>
        <select
          id="decline-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="border-line-strong bg-surface-raised text-body mt-1 min-h-11 w-full rounded-sm border-[1.5px] px-3"
        >
          {DECLINE_REASONS.map((r) => (
            <option key={r} value={r}>
              {t(r)}
            </option>
          ))}
        </select>
      </Dialog>

      <Dialog
        open={dialog === 'complete'}
        title={t('complete.title', { code: order.code })}
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              {t('complete.notYet')}
            </Button>
            <Button
              onClick={() => {
                setStatus('completed');
                setDialog(null);
                Notification.success({
                  title: t('toast.completedTitle'),
                  text: t('toast.completedText', { code: order.code }),
                });
              }}
            >
              {t('actions.complete')}
            </Button>
          </>
        }
      >
        <p>{t('complete.text')}</p>
        <p className="text-ink-muted text-[14px]">{t('complete.auto')}</p>
      </Dialog>
    </div>
  );
};

export default FarmerOrderDetailPage;
