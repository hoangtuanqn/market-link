import { isAxiosError } from 'axios';
import { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { AdminReportApi } from '@/api-requests/report.requests';
import ReviewApi from '@/api-requests/review.requests';
import Avatar from '@/components/Avatar';
import BanDurationPicker, { type BanDuration } from '@/components/BanDurationPicker';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import ReviewCard from '@/components/ReviewCard';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import ReasonPicker from '@/components/ReasonPicker';
import { Dialog } from '@/components/ui/dialog';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_CUSTOMERS_PATH, ADMIN_MODERATION_PATH, ADMIN_ORDERS_PATH } from '@/constants/nav';
import type { OrderListItemDto } from '@/api-requests/order.requests';
import useRequest from '@/hooks/useRequest';
import { formatDate, pickupLabel, money } from '@/lib/format';
import type { OrderStatus } from '@/types/order.types';
import { composeReason, emptyReason, type ReasonValue } from '@/lib/reasons';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import { CustomerStatusPill } from '@/pages/admin/Customers';
import CustomerDetailSkeleton from './CustomerDetailSkeleton';

const isNotFound = (error: unknown) => isAxiosError(error) && error.response?.status === 404;

const ORDER_STATUSES: OrderStatus[] = ['placed', 'accepted', 'ready', 'completed', 'declined', 'cancelled'];

type ConfirmKind = 'deactivate' | 'reactivate';

/**
 * FR-072 — one customer: their orders across every stall, the reviews they wrote, and the account itself. Orders are
 * read-only (D-04); deactivating or reactivating the account is the only action here, and every past deactivate/
 * reactivate (reason, duration, who did it) is listed in the "Account history" section below.
 */
const AdminCustomerDetailPage = () => {
  const { t } = useTranslation('AdminCustomerDetail');
  const { t: tc } = useTranslation();
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);

  const {
    state: customerLoad,
    retry: retryCustomer,
    mutate: mutateCustomer,
  } = useRequest(`admin-customer:${id}`, () =>
    Number.isFinite(id) ? AdminReportApi.customer(id) : Promise.reject(new Error('not a customer id')),
  );
  const { state: ordersLoad, retry: retryOrders } = useRequest(`admin-customer-orders:${id}`, () =>
    Number.isFinite(id) ? AdminReportApi.orders({ customerId: id, pageSize: 20 }) : Promise.reject(new Error('n/a')),
  );
  const { state: reviewsLoad, retry: retryReviews } = useRequest(`admin-customer-reviews:${id}`, () =>
    Number.isFinite(id) ? ReviewApi.adminList({ customerId: id, pageSize: 10 }) : Promise.reject(new Error('n/a')),
  );
  const { state: historyLoad, retry: retryHistory } = useRequest(`admin-customer-history:${id}`, () =>
    Number.isFinite(id) ? AdminReportApi.customerStatusHistory(id, 1, 20) : Promise.reject(new Error('n/a')),
  );

  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  const [reason, setReason] = useState<ReasonValue>(emptyReason);
  const [duration, setDuration] = useState<BanDuration>({ kind: 'permanent' });
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (customerLoad.kind === 'loading' || initialLoading) {
    return <CustomerDetailSkeleton />;
  }

  if (!Number.isFinite(id) || (customerLoad.kind === 'error' && isNotFound(customerLoad.error))) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('missing.title')}</h1>
        <p className="text-ink-muted">{t('missing.text')}</p>
        <ButtonLink to={ADMIN_CUSTOMERS_PATH}>{t('allCustomers')}</ButtonLink>
      </div>
    );
  }

  if (customerLoad.kind === 'error') {
    return <LoadError noun={t('noun')} onRetry={retryCustomer} />;
  }

  const customer = customerLoad.data;
  const active = customer.status === 'active';
  const orders = ordersLoad.kind === 'ready' ? ordersLoad.data.items : [];
  const statusCounts = ORDER_STATUSES.map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
  })).filter((s) => s.count > 0);

  const openConfirm = (kind: ConfirmKind) => {
    setReason(emptyReason());
    setDuration({ kind: 'permanent' });
    setConfirmKind(kind);
  };

  const runConfirmedAction = async () => {
    if (!confirmKind) return;
    const status = confirmKind === 'deactivate' ? 'inactive' : 'active';
    const trimmedReason = composeReason('deactivate', reason);
    const until = confirmKind === 'deactivate' && duration.kind === 'temporary' ? duration.until : null;
    setBusy(true);
    try {
      const updated = await AdminReportApi.setCustomerStatus(
        customer.userId,
        status,
        confirmKind === 'deactivate' ? trimmedReason : null,
        until,
      );
      mutateCustomer(() => updated);
      const toastKey =
        confirmKind === 'deactivate'
          ? trimmedReason
            ? 'toast.deactivatedWithReason'
            : 'toast.deactivated'
          : 'toast.reactivated';
      Notification.success({ text: t(toastKey, { name: customer.fullName, reason: trimmedReason }) });
      setConfirmKind(null);
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusy(false);
    }
  };

  const columns: TableColumn<OrderListItemDto>[] = [
    {
      key: 'code',
      label: t('col.order'),
      render: (o) => (
        <Link to={`${ADMIN_ORDERS_PATH}/${o.orderId}`} className="text-brand underline">
          {o.orderCode}
        </Link>
      ),
    },
    {
      key: 'stall',
      label: t('col.stall'),
      render: (o) => (
        <>
          {o.stallName}
          <span className="text-ink-muted block text-[13px]">{o.marketName}</span>
        </>
      ),
    },
    {
      key: 'pickup',
      label: t('col.pickup'),
      render: (o) => pickupLabel(o.pickupDate, `${o.pickupStart}–${o.pickupEnd}`),
    },
    { key: 'items', label: t('col.items'), align: 'num', render: (o) => o.itemCount },
    { key: 'total', label: t('col.total'), align: 'num', render: (o) => money(o.totalAmount) },
    { key: 'status', label: t('col.status'), render: (o) => <OrderStatusBadge status={o.status} /> },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to={ADMIN_CUSTOMERS_PATH} className="text-brand underline">
          {t('allCustomers')}
        </Link>{' '}
        · {customer.fullName}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            name={customer.fullName}
            email={customer.email}
            url={customer.avatarUrl ?? undefined}
            size={64}
            className="shrink-0 text-xl font-bold shadow-sm"
          />
          <div className="flex flex-col gap-1.5">
            <p className="text-overline text-ink-muted uppercase">
              {t('since', { joined: formatDate(new Date(customer.createdAt)) })}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-h2 text-ink leading-tight font-bold">{customer.fullName}</h1>
              <CustomerStatusPill active={active} />
            </div>
          </div>
        </div>
        {active ? (
          <Button variant="danger" onClick={() => openConfirm('deactivate')}>
            {t('action.deactivate')}
          </Button>
        ) : (
          <Button onClick={() => openConfirm('reactivate')}>{t('action.reactivate')}</Button>
        )}
      </div>

      <div className="grid flex-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-1 flex-col gap-6">
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-h2">{t('orders.title')}</h2>
              <Link to={ADMIN_ORDERS_PATH} className="text-brand text-small underline">
                {t('orders.all')}
              </Link>
            </div>
            {ordersLoad.kind === 'loading' ? (
              <div className="border-line-strong bg-surface-raised min-h-[140px] w-full animate-pulse rounded-md border-[1.5px] p-6" />
            ) : ordersLoad.kind === 'error' ? (
              <LoadError noun={t('orders.noun')} onRetry={retryOrders} />
            ) : orders.length ? (
              <>
                <Table columns={columns} rows={orders} />
                <p className="text-small text-ink-muted">{t('orders.note')}</p>
              </>
            ) : (
              <DataState
                center
                title={t('orders.empty.title')}
                text={t('orders.empty.text')}
                className="min-h-[140px] w-full max-w-none py-6"
              />
            )}
          </section>

          <section className="flex flex-1 flex-col gap-3">
            <h2 className="text-h2">{t('reviews.title')}</h2>
            {reviewsLoad.kind === 'loading' ? (
              <div className="border-line-strong bg-surface-raised min-h-[160px] w-full flex-1 animate-pulse rounded-md border-[1.5px] p-6" />
            ) : reviewsLoad.kind === 'error' ? (
              <LoadError noun={t('reviews.noun')} onRetry={retryReviews} />
            ) : reviewsLoad.data.items.length ? (
              <div className="flex flex-1 flex-col gap-3">
                {reviewsLoad.data.items.map((r) => (
                  <ReviewCard
                    key={r.id}
                    author={r.customerName}
                    date={formatDate(new Date(r.createdAt))}
                    target={r.targetName}
                    rating={r.rating}
                    text={r.comment ?? ''}
                    reply={
                      r.response
                        ? {
                            by: r.stallName,
                            date: formatDate(new Date(r.response.createdAt)),
                            text: r.response.responseText,
                          }
                        : undefined
                    }
                    fluid
                    actions={
                      <ButtonLink to={ADMIN_MODERATION_PATH} variant="ghost" size="sm">
                        {t('reviews.openInModeration')}
                      </ButtonLink>
                    }
                  />
                ))}
                <p className="text-small text-ink-muted">{t('reviews.note')}</p>
              </div>
            ) : (
              <DataState
                center
                title={t('reviews.empty.title')}
                text={t('reviews.empty.text')}
                className="min-h-[160px] w-full max-w-none flex-1 py-8"
              />
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('history.title')}</h2>
            {historyLoad.kind === 'loading' ? (
              <div className="border-line-strong bg-surface-raised min-h-[140px] w-full animate-pulse rounded-md border-[1.5px] p-6" />
            ) : historyLoad.kind === 'error' ? (
              <LoadError noun={t('history.noun')} onRetry={retryHistory} />
            ) : historyLoad.data.items.length ? (
              <Table
                columns={[
                  {
                    key: 'when',
                    label: t('history.col.when'),
                    render: (h) => formatDate(new Date(h.changedAt)),
                  },
                  {
                    key: 'action',
                    label: t('history.col.action'),
                    render: (h) => t(`history.action.${h.toStatus}` as never),
                  },
                  { key: 'reason', label: t('history.col.reason'), render: (h) => h.reason ?? '—' },
                  {
                    key: 'until',
                    label: t('history.col.until'),
                    render: (h) => (h.until ? formatDate(new Date(h.until)) : '—'),
                  },
                  {
                    key: 'by',
                    label: t('history.col.by'),
                    render: (h) => h.changedByName ?? t('history.system'),
                  },
                ]}
                rows={historyLoad.data.items}
              />
            ) : (
              <DataState
                center
                title={t('history.empty.title')}
                text={t('history.empty.text')}
                className="min-h-[140px] w-full max-w-none py-6"
              />
            )}
          </section>
        </div>

        <aside className="flex flex-1 flex-col gap-4">
          <Card className="flex shrink-0 flex-col gap-3 p-6">
            <h2 className="text-h3">{t('contact.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('contact.email')}</dt>
              <dd className="m-0 break-all">{customer.email}</dd>
              <dt className="text-ink-muted">{t('contact.phone')}</dt>
              <dd className="m-0">{customer.phone ?? '—'}</dd>
              <dt className="text-ink-muted">{t('contact.joined')}</dt>
              <dd className="m-0">{formatDate(new Date(customer.createdAt))}</dd>
            </dl>
          </Card>

          <Card className="flex shrink-0 flex-col gap-3 p-6">
            <h2 className="text-h3">{t('habits.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('habits.orders')}</dt>
              <dd className="m-0">{customer.orderCount}</dd>
              {statusCounts.map((s) => (
                <Fragment key={s.status}>
                  <dt className="text-ink-muted">{t(`orderStatus.${s.status}`, { ns: 'common' })}</dt>
                  <dd className="m-0">{s.count}</dd>
                </Fragment>
              ))}
            </dl>
            {orders.length > 0 && orders.length < customer.orderCount && (
              <p className="text-ink-muted text-[13px]">{t('habits.loadedNote', { count: orders.length })}</p>
            )}
          </Card>

          <Card className="bg-surface-sunken flex flex-1 flex-col justify-start gap-2.5 p-5">
            <h3 className="text-h3 text-ink font-bold">{t('whatItDoes.title')}</h3>
            <p className="text-small text-ink-muted leading-relaxed">{t('whatItDoes.text')}</p>
          </Card>
        </aside>
      </div>

      <Dialog
        open={confirmKind !== null}
        tone={confirmKind === 'deactivate' ? 'danger' : undefined}
        title={confirmKind ? t(`${confirmKind}.title`, { name: customer.fullName }) : ''}
        onClose={() => setConfirmKind(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmKind(null)} disabled={busy}>
              {t(confirmKind === 'deactivate' ? 'deactivate.keep' : 'reactivate.keep')}
            </Button>
            <Button
              variant={confirmKind === 'deactivate' ? 'danger' : 'primary'}
              disabled={busy || (confirmKind === 'deactivate' && !composeReason('deactivate', reason))}
              onClick={() => void runConfirmedAction()}
            >
              {confirmKind ? t(`${confirmKind}.confirm`) : ''}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{confirmKind ? t(`${confirmKind}.text`) : ''}</p>
          {confirmKind === 'deactivate' && (
            <div className="flex flex-col gap-3">
              <BanDurationPicker value={duration} onChange={setDuration} />
              <ReasonPicker
                id="deactivate-reason"
                kind="deactivate"
                label={t('deactivate.reason')}
                value={reason}
                onChange={setReason}
                required
                error={!composeReason('deactivate', reason) ? t('deactivate.reasonRequired') : undefined}
              />
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default AdminCustomerDetailPage;
