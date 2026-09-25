import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import DirectionsButton from '@/components/DirectionsButton';
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

const STEPS: OrderStatus[] = ['placed', 'accepted', 'ready', 'completed'];

/** FR-033 FR-034 FR-035 FR-038 — order detail: ticket, pickup point, status history, and the change/cancel panel. */
const CustomerOrderDetailPage = () => {
  const { t } = useTranslation('CustomerOrderDetail');
  const { t: tc } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const order = orders.find((o) => o.code.replace('#', '') === code);
  const [previewLocked, setPreviewLocked] = useState(false);

  if (!order) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('missing.title')}</h1>
        <p className="text-ink-muted">{t('missing.text')}</p>
        <ButtonLink to="/orders">{t('myOrders')}</ButtonLink>
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
            popup: { title: f.stall, lines: [tc('map.stallPickup', { code: f.stallCode, pickup: f.pickup })] },
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
          {t('myOrders')}
        </Link>{' '}
        · {t('breadcrumb', { code: order.code })}
      </p>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">
            {t('placedAt', { time: firstStep[1] })} · {t(`status.${lastStep[0]}`)} {lastStep[1]}
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
                  {t(`status.${s}`)}
                </span>
              </span>
            ))}
          </div>
        </div>
        <Chip pressed={previewLocked} onClick={() => setPreviewLocked((v) => !v)}>
          {t('previewLocked')}
        </Chip>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-8">
          <OrderTicket order={effectiveOrder} fluid hideActions />

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('pickup.title')}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="flex flex-col gap-3 p-4">
                <h3 className="text-h3">
                  {t('pickup.where', { market: marketName(order.marketId), stall: f?.stallCode })}
                </h3>
                <p className="text-[15px]">
                  {markets.find((m) => m.id === order.marketId)?.address}. {t('pickup.spot')}
                </p>
                <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                  <dt className="text-ink-muted">{t('pickup.slot')}</dt>
                  <dd className="m-0">
                    {order.date} · {order.slot}
                  </dd>
                  <dt className="text-ink-muted">{t('pickup.phone')}</dt>
                  <dd className="m-0">{f?.phone}</dd>
                  <dt className="text-ink-muted">{t('pickup.bring')}</dt>
                  <dd className="m-0">{t('pickup.bringText', { total: vnd(orderTotal(order)) })}</dd>
                </dl>
                <div className="flex flex-wrap gap-2">
                  {f && f.lat != null && f.lng != null && (
                    <DirectionsButton to={{ lat: f.lat, lng: f.lng }} name={f.stall} variant="secondary" />
                  )}
                  <ButtonLink to={`/stalls/${order.farmerId}`} variant="ghost" size="sm">
                    {t('pickup.stallPage')}
                  </ButtonLink>
                </div>
              </Card>
              <MarketMap
                label={t('pickup.map', { stall: f?.stallCode ?? '' })}
                markers={mapMarkers}
                className="min-h-60"
                scrollWheelZoom={false}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('history.title')}</h2>
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
                    <time className="text-ink-muted mt-0.5 block text-[13px]">{t('history.by', { time, by })}</time>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-ink-muted text-[13px]">{t('history.note')}</p>
          </section>
        </div>

        <aside className="sticky top-20 flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('change.title')}</h2>
            {!locked && (
              <p className="text-[15px]">
                <Trans
                  t={t}
                  i18nKey="change.until"
                  values={{ cutoff: order.cutoff, stall: farmerName(order.farmerId) }}
                  components={{ b: <b /> }}
                />
              </p>
            )}
            <ButtonLink to={`/orders/${code}/edit`} variant="secondary" className="w-full" aria-disabled={!editable}>
              {t('change.edit')}
            </ButtonLink>
            <Button variant="danger" className="w-full" disabled={locked}>
              {t('change.cancel')}
            </Button>
            {locked && (
              <p className="text-ink-muted text-[13px]">
                {t('change.locked', { cutoff: order.cutoff, phone: f?.phone })}
              </p>
            )}
          </Card>
          <Card className="flex flex-col gap-2 p-6">
            <h2 className="text-h3">{t('notify.title')}</h2>
            <p className="text-[15px]">{t('notify.text')}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default CustomerOrderDetailPage;
