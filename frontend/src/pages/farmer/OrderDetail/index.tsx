import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import AskAssistant from '@/components/assistant/AskAssistant';
import OrderApi, { type OrderDetailDto, type OrderItemDto } from '@/api-requests/order.requests';
import BestBeforeLine from '@/components/BestBeforeLine';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { LoadError } from '@/components/ui/data-state';
import { Table, type TableColumn } from '@/components/ui/table';
import { ORDER_STATUS_META } from '@/constants/orderStatus';
import useRequest from '@/hooks/useRequest';
import { cutoffLabel, perUnit, pickupLabel, units, money } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const DECLINE_REASONS = ['stock', 'day', 'time', 'other'] as const;
type DeclineReason = (typeof DECLINE_REASONS)[number];

const isGone = (error: unknown) =>
  isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404);

const FarmerOrderDetailPage = () => {
  const { t, i18n } = useTranslation('FarmerOrderDetail');
  const { t: tc } = useTranslation();
  const { t: tAssistant } = useTranslation('common');
  const { code } = useParams<{ code: string }>();
  const id = /^\d+$/.test(code ?? '') ? Number(code) : null;

  const { state, retry, mutate } = useRequest(`farmer-order:${id ?? 'none'}`, () =>
    id === null ? Promise.reject(new Error('not an order id')) : OrderApi.get(id),
  );
  const order = state.kind === 'ready' ? state.data : null;

  const [dialog, setDialog] = useState<'decline' | 'complete' | null>(null);
  const [reason, setReason] = useState<DeclineReason>(DECLINE_REASONS[0]);
  const [busy, setBusy] = useState(false);

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
        <ButtonLink to="/farmer/orders">{t('missing.back')}</ButtonLink>
      </div>
    );
  }

  if (state.kind === 'error' || !order) {
    return <LoadError noun={t('noun')} onRetry={retry} />;
  }

  const s = order.summary;
  const total = s.totalAmount;
  const itemsText = new Intl.ListFormat(i18n.language, { style: 'short', type: 'unit' }).format(
    order.items.map((i) => t('decline.item', { qty: units(i.quantity, i.unit), name: i.productName })),
  );

  const runAction = async (action: () => Promise<OrderDetailDto>, successTitle: string, successText: string) => {
    setBusy(true);
    try {
      const updated = await action();
      mutate(() => updated);
      Notification.success({ title: successTitle, text: successText });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
      if (isAxiosError(error) && error.response?.status === 409) retry();
    } finally {
      setBusy(false);
    }
  };

  const columns: TableColumn<OrderItemDto>[] = [
    {
      key: 'n',
      label: t('col.product'),
      render: (i) => (
        <>
          {i.productName}
          <span className="text-ink-muted mt-0.5 block text-[13px] font-normal">{perUnit(i.unitPrice, i.unit)}</span>
          <BestBeforeLine bestBefore={i.bestBefore} storageMode={i.storageMode} />
        </>
      ),
    },
    { key: 'q', label: t('col.requested'), align: 'num', render: (i) => units(i.quantity, i.unit) },
    { key: 't', label: t('col.amount'), align: 'num', render: (i) => money(i.subtotal) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/farmer/orders" className="text-brand underline">
          {t('crumb')}
        </Link>{' '}
        · {s.orderCode}
      </p>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">{t('cutoff', { cutoff: cutoffLabel(s.cutoffAt) })}</p>
          <h1 className="text-h1 text-ink font-bold">
            {s.orderCode} · {order.customer?.fullName ?? '—'} ·{' '}
            {pickupLabel(s.pickupDate, `${s.pickupStart}–${s.pickupEnd}`)}
          </h1>
          <OrderStatusBadge status={s.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <AskAssistant
            question={tAssistant('assistant.ask.order', { code: s.orderCode })}
            record={{ type: 'order', ref: s.orderCode }}
          />
          {s.status === 'placed' && (
            <>
              <Button
                disabled={busy}
                onClick={() =>
                  void runAction(
                    () => OrderApi.accept(s.orderId),
                    t('toast.acceptedTitle'),
                    t('toast.acceptedText', { code: s.orderCode, who: order.customer?.fullName ?? '' }),
                  )
                }
              >
                {t('actions.accept')}
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => setDialog('decline')}>
                {t('actions.decline')}
              </Button>
            </>
          )}
          {s.status === 'accepted' && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void runAction(
                  () => OrderApi.markReady(s.orderId),
                  t('toast.readyTitle'),
                  t('toast.readyText', { code: s.orderCode }),
                )
              }
            >
              {t('actions.ready')}
            </Button>
          )}
          {s.status === 'ready' && (
            <Button disabled={busy} onClick={() => setDialog('complete')}>
              {t('actions.complete')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('items.title')}</h2>
            <Table columns={columns} rows={order.items} />
            <p className="border-line-strong flex justify-between gap-3 border-t pt-3 font-bold">
              <span>{t('items.total')}</span>
              <span className="font-hand text-price">{money(total)}</span>
            </p>
          </section>

          {order.customerNote && (
            <section className="flex flex-col gap-3">
              <h2 className="text-h2">{t('note')}</h2>
              <Card className="p-4 text-[16px]">{t('quote', { text: order.customerNote })}</Card>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('history.title')}</h2>
            <ol className="m-0 flex flex-col p-0">
              {order.statusHistory.map((h, i) => {
                const Icon = ORDER_STATUS_META[h.toStatus].icon;
                return (
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
                        ORDER_STATUS_META[h.toStatus].className,
                      )}
                    >
                      <Icon size={14} />
                    </span>
                    <div>
                      <OrderStatusBadge status={h.toStatus} />
                      <time dateTime={h.changedAt} className="text-ink-muted mt-1 block text-[13px]">
                        {h.changedByName
                          ? t('history.by', { time: cutoffLabel(h.changedAt), by: h.changedByName })
                          : cutoffLabel(h.changedAt)}
                      </time>
                      {h.note && <p className="text-ink-muted mt-0.5 text-[13px]">{h.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('customer.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('customer.name')}</dt>
              <dd className="m-0">{order.customer?.fullName ?? '—'}</dd>
              <dt className="text-ink-muted">{t('customer.phone')}</dt>
              <dd className="m-0">{order.customer?.phone ?? '—'}</dd>
              <dt className="text-ink-muted">{t('customer.email')}</dt>
              <dd className="m-0">{order.customer?.email ?? '—'}</dd>
            </dl>
          </Card>
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('pickup.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('pickup.market')}</dt>
              <dd className="m-0">{s.marketName}</dd>
              <dt className="text-ink-muted">{t('pickup.slot')}</dt>
              <dd className="m-0">{pickupLabel(s.pickupDate, `${s.pickupStart}–${s.pickupEnd}`)}</dd>
              <dt className="text-ink-muted">{t('pickup.pay')}</dt>
              <dd className="text-price m-0">{money(total)}</dd>
            </dl>
          </Card>
        </aside>
      </div>

      <Dialog
        open={dialog === 'decline'}
        title={t('decline.title', { code: s.orderCode })}
        tone="danger"
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              {t('decline.keep')}
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                setDialog(null);
                void runAction(
                  () => OrderApi.decline(s.orderId, t(`decline.reasons.${reason}`)),
                  t('toast.declinedTitle'),
                  t('toast.declinedText', { code: s.orderCode }),
                );
              }}
            >
              {t('decline.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('decline.text', { who: order.customer?.fullName ?? '', items: itemsText })}</p>
        <label className="text-ink-muted mt-2 block text-[13px] font-bold" htmlFor="decline-reason">
          {t('decline.reason')}
        </label>
        <select
          id="decline-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value as DeclineReason)}
          className="border-line-strong bg-surface-raised text-body mt-1 min-h-11 w-full rounded-sm border-[1.5px] px-3"
        >
          {DECLINE_REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`decline.reasons.${r}`)}
            </option>
          ))}
        </select>
      </Dialog>

      <Dialog
        open={dialog === 'complete'}
        title={t('complete.title', { code: s.orderCode })}
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              {t('complete.notYet')}
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setDialog(null);
                void runAction(
                  () => OrderApi.complete(s.orderId),
                  t('toast.completedTitle'),
                  t('toast.completedText', { code: s.orderCode }),
                );
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
