import { isAxiosError } from 'axios';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import CatalogApi from '@/api-requests/catalog.requests';
import OrderApi, { type OrderDetailDto } from '@/api-requests/order.requests';
import StallApi from '@/api-requests/stall.requests';
import BestBeforeLine from '@/components/BestBeforeLine';
import MessageStallButton from '@/components/chat/MessageStallButton';
import DirectionsButton from '@/components/DirectionsButton';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { ORDER_STATUS_META } from '@/constants/orderStatus';
import useRequest from '@/hooks/useRequest';
import { formatClock, formatDate, formatTime, money } from '@/lib/format';
import type { OrderStatus } from '@/types/order.types';
import Helper from '@/utils/helper';

const STEPS: OrderStatus[] = ['placed', 'accepted', 'ready', 'completed'];

/** `yyyy-MM-dd` → a Date in local time; `new Date('2026-10-03')` is midnight UTC and lands on the previous day at UTC−x. */
const localDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** An ISO instant (cutoff, history) as the reader's date and time. */
const when = (iso: string) => {
  const at = new Date(iso);
  return `${formatDate(at)} ${formatTime(at)}`;
};

/** 403 (someone else's order) and 404 read the same to the customer: the order is not theirs to see. */
const isGone = (error: unknown) =>
  isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404);

/**
 * FR-033 FR-034 FR-035 FR-036 FR-038 FR-114 — the customer's order: what was ordered at the prices copied when it was
 * placed, where to collect it, the status history, and the change/cancel panel. The server decides what may still be
 * changed (`canModify`, `canCancel`); the page only shows it. Backend notifications link here as `/orders/{id}`.
 */
const CustomerOrderDetailPage = () => {
  const { t } = useTranslation('CustomerOrderDetail');
  const { t: tc } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const id = /^\d+$/.test(code ?? '') ? Number(code) : null;

  const { state, retry, mutate } = useRequest(`order:${id ?? 'none'}`, () =>
    id === null ? Promise.reject(new Error('not an order id')) : OrderApi.get(id),
  );
  const order = state.kind === 'ready' ? state.data : null;
  const farmerId = order?.summary.farmerId;
  const marketId = order?.summary.marketId;
  const { state: stallLoad } = useRequest(`order-stall:${farmerId ?? 'none'}`, () =>
    farmerId ? StallApi.get(farmerId) : Promise.resolve(null),
  );
  const { state: marketLoad } = useRequest(`order-market:${marketId ?? 'none'}`, () =>
    marketId ? CatalogApi.getMarket(marketId) : Promise.resolve(null),
  );

  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelFailed, setCancelFailed] = useState(false);

  if (state.kind === 'loading' && id !== null) {
    return (
      <p role="status" className="text-ink-muted">
        {tc('notify.list.loading')}
      </p>
    );
  }

  if (id === null || (state.kind === 'error' && isGone(state.error))) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('missing.title')}</h1>
        <p className="text-ink-muted">{t('missing.text')}</p>
        <ButtonLink to="/orders">{t('myOrders')}</ButtonLink>
      </div>
    );
  }

  if (state.kind === 'error' || !order) {
    return <LoadError noun={t('noun')} onRetry={retry} />;
  }

  const s = order.summary;
  const stall = stallLoad.kind === 'ready' ? stallLoad.data : null;
  const at = stall?.markets.find((m) => m.marketId === s.marketId);
  const address = marketLoad.kind === 'ready' ? marketLoad.data?.market.address : undefined;
  const slot = `${formatClock(s.pickupStart)}–${formatClock(s.pickupEnd)}`;
  const day = formatDate(localDay(s.pickupDate));
  const hasPin = at?.stallLatitude != null && at?.stallLongitude != null;
  const mapMarkers: MapMarker[] = hasPin
    ? [
        {
          lat: at.stallLatitude!,
          lng: at.stallLongitude!,
          kind: 'stall',
          label: s.stallName,
          selected: true,
          popup: {
            title: s.stallName,
            lines: [t('pickup.where', { market: s.marketName, stall: at.stallCode ?? '' })],
          },
        },
      ]
    : [];
  const stepIndex = STEPS.indexOf(s.status);
  const placed = order.statusHistory[0];
  const changeable = order.canModify || order.canCancel;
  const pastCutoff = !changeable && (s.status === 'placed' || s.status === 'accepted');

  const cancel = async () => {
    setCancelling(true);
    setCancelFailed(false);
    try {
      const updated: OrderDetailDto = await OrderApi.cancel(s.orderId);
      mutate(() => updated);
    } catch {
      setCancelFailed(true);
    } finally {
      setCancelling(false);
      setConfirming(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/orders" className="text-brand underline">
          {t('myOrders')}
        </Link>{' '}
        · {t('breadcrumb', { code: s.orderCode })}
      </p>

      <div className="flex flex-col gap-2">
        {placed ? <p className="text-ink-muted">{t('placedAt', { time: when(placed.changedAt) })}</p> : null}
        <h1 className="font-hand text-h1">
          {s.stallName} · {day}, {slot}
        </h1>
        {STEPS.includes(s.status) ? (
          <div className="flex flex-wrap items-center gap-2">
            {STEPS.map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true" className="border-line-strong w-6 border-t-2 border-dotted" />}
                <span className={Helper.cn('text-[14px]', stepIndex >= i ? 'text-ink font-bold' : 'text-ink-muted')}>
                  {t(`status.${step}`)}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <OrderStatusBadge status={s.status} />
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-8">
          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-h3">{t('items.title')}</h2>
            <ul aria-label={t('items.title')} className="m-0 flex flex-col gap-2 p-0">
              {order.items.map((item) => (
                <li key={item.productId} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-semibold">{item.productName}</span>
                    <span className="text-small text-ink-muted">
                      {t('items.line', { qty: item.quantity, unit: item.unit, price: money(item.unitPrice) })}
                    </span>
                    <BestBeforeLine bestBefore={item.bestBefore} storageMode={item.storageMode} />
                  </span>
                  <span className="font-hand text-price shrink-0">{money(item.subtotal)}</span>
                </li>
              ))}
            </ul>
            <p className="border-line-strong flex justify-between gap-3 border-t pt-3 font-bold">
              <span>{t('items.total')}</span>
              <span className="font-hand text-price">{money(s.totalAmount)}</span>
            </p>
            {order.customerNote ? <p className="text-small text-ink-muted">{order.customerNote}</p> : null}
            {s.status === 'declined' && order.farmerNote ? (
              <p className="text-small">{t('declined', { reason: order.farmerNote })}</p>
            ) : null}
          </Card>

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('pickup.title')}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="flex flex-col gap-3 p-4">
                <h3 className="text-h3">{t('pickup.where', { market: s.marketName, stall: at?.stallCode ?? '—' })}</h3>
                {address ? <p className="text-[15px]">{address}</p> : null}
                <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
                  <dt className="text-ink-muted">{t('pickup.slot')}</dt>
                  <dd className="m-0">
                    {day} · {slot}
                  </dd>
                  <dt className="text-ink-muted">{t('pickup.bring')}</dt>
                  <dd className="m-0">{t('pickup.bringText', { total: money(s.totalAmount) })}</dd>
                </dl>
                <div className="flex flex-wrap gap-2">
                  {hasPin && (
                    <DirectionsButton
                      to={{ lat: at.stallLatitude!, lng: at.stallLongitude! }}
                      name={s.stallName}
                      variant="secondary"
                    />
                  )}
                  <ButtonLink to={`/stalls/${s.farmerId}`} variant="ghost" size="sm">
                    {t('pickup.stallPage')}
                  </ButtonLink>
                </div>
              </Card>
              {hasPin ? (
                <MarketMap
                  label={t('pickup.map', { stall: at.stallCode ?? s.stallName })}
                  markers={mapMarkers}
                  className="min-h-60"
                  scrollWheelZoom={false}
                />
              ) : null}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('history.title')}</h2>
            <ol className="m-0 flex flex-col p-0">
              {order.statusHistory.map((h, i) => {
                const Icon = ORDER_STATUS_META[h.toStatus].icon;
                return (
                  <li key={i} className="relative grid grid-cols-[28px_1fr] items-start gap-3 py-2">
                    <span
                      className={Helper.cn(
                        'grid size-7 flex-none place-items-center rounded-full',
                        ORDER_STATUS_META[h.toStatus].className,
                      )}
                    >
                      <Icon size={14} />
                    </span>
                    <div>
                      <OrderStatusBadge status={h.toStatus} />
                      <time dateTime={h.changedAt} className="text-ink-muted mt-1 block text-[13px]">
                        {h.changedByName
                          ? t('history.by', { time: when(h.changedAt), by: h.changedByName })
                          : when(h.changedAt)}
                      </time>
                      {h.note ? <p className="text-small text-ink-muted">{h.note}</p> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="text-ink-muted text-[13px]">{t('history.note')}</p>
          </section>
        </div>

        <aside className="sticky top-20 flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('change.title')}</h2>
            {changeable ? (
              <p className="text-[15px]">
                <Trans
                  t={t}
                  i18nKey="change.until"
                  values={{ cutoff: when(s.cutoffAt), stall: s.stallName }}
                  components={{ b: <b /> }}
                />
              </p>
            ) : (
              <p className="text-ink-muted text-[15px]">
                {pastCutoff ? t('change.lockedContact', { cutoff: when(s.cutoffAt) }) : t('change.settledContact')}
              </p>
            )}
            {order.canModify ? (
              <ButtonLink to={`/orders/${s.orderId}/edit`} variant="secondary" className="w-full">
                {t('change.edit')}
              </ButtonLink>
            ) : null}
            <Button
              variant="danger"
              className="w-full"
              disabled={!order.canCancel || cancelling}
              onClick={() => setConfirming(true)}
            >
              {t('change.cancel')}
            </Button>
            {cancelFailed ? (
              <p role="alert" className="text-small text-danger">
                {t('change.cancelFailed')}
              </p>
            ) : null}
            <MessageStallButton farmerId={s.farmerId} orderId={s.orderId} />
          </Card>
          <Card className="flex flex-col gap-2 p-6">
            <h2 className="text-h3">{t('notify.title')}</h2>
            <p className="text-[15px]">{t('notify.text')}</p>
          </Card>
        </aside>
      </div>

      <Dialog
        open={confirming}
        tone="danger"
        title={t('cancelDialog.title')}
        onClose={() => setConfirming(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {t('cancelDialog.keep')}
            </Button>
            <Button variant="dangerFill" disabled={cancelling} onClick={() => void cancel()}>
              {t('change.cancel')}
            </Button>
          </>
        }
      >
        <p>{t('cancelDialog.text', { stall: s.stallName })}</p>
      </Dialog>
    </div>
  );
};

export default CustomerOrderDetailPage;
