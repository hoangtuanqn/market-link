import { isAxiosError } from 'axios';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { AdminReportApi } from '@/api-requests/report.requests';
import ReviewApi from '@/api-requests/review.requests';
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

const isNotFound = (error: unknown) => isAxiosError(error) && error.response?.status === 404;

const ORDER_STATUSES: OrderStatus[] = ['placed', 'accepted', 'ready', 'completed', 'declined', 'cancelled'];

type ConfirmKind = 'deactivate' | 'reactivate';

/**
 * FR-072 — one customer: their orders across every stall, the reviews they wrote, and the account itself. Orders are
 * read-only (D-04); the only action here is deactivating or reactivating the account. There is no account-history
 * endpoint, so the page shows what the server actually has: when the account was created and a count of their orders by
 * state, from the orders already loaded below.
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

  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  const [reason, setReason] = useState<ReasonValue>(emptyReason);
  const [busy, setBusy] = useState(false);

  if (customerLoad.kind === 'loading') {
    return (
      <p role="status" className="text-ink-muted">
        {tc('notify.list.loading')}
      </p>
    );
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
    setConfirmKind(kind);
  };

  const runConfirmedAction = async () => {
    if (!confirmKind) return;
    const status = confirmKind === 'deactivate' ? 'inactive' : 'active';
    setBusy(true);
    try {
      const updated = await AdminReportApi.setCustomerStatus(customer.userId, status);
      mutateCustomer(() => updated);
      const trimmedReason = composeReason('deactivate', reason);
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
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to={ADMIN_CUSTOMERS_PATH} className="text-brand underline">
          {t('allCustomers')}
        </Link>{' '}
        · {customer.fullName}
      </p>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-overline text-ink-muted uppercase">
            {t('since', { joined: formatDate(new Date(customer.createdAt)) })}
          </p>
          <h1 className="text-h2">{customer.fullName}</h1>
          <div>
            <CustomerStatusPill active={active} />
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-h2">{t('orders.title')}</h2>
              <Link to={ADMIN_ORDERS_PATH} className="text-brand text-small underline">
                {t('orders.all')}
              </Link>
            </div>
            {ordersLoad.kind === 'loading' ? (
              <p role="status" className="text-ink-muted">
                {tc('notify.list.loading')}
              </p>
            ) : ordersLoad.kind === 'error' ? (
              <LoadError noun={t('orders.noun')} onRetry={retryOrders} />
            ) : orders.length ? (
              <>
                <Table columns={columns} rows={orders} />
                <p className="text-small text-ink-muted">{t('orders.note')}</p>
              </>
            ) : (
              <DataState title={t('orders.empty.title')} text={t('orders.empty.text')} />
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('reviews.title')}</h2>
            {reviewsLoad.kind === 'loading' ? (
              <p role="status" className="text-ink-muted">
                {tc('notify.list.loading')}
              </p>
            ) : reviewsLoad.kind === 'error' ? (
              <LoadError noun={t('reviews.noun')} onRetry={retryReviews} />
            ) : reviewsLoad.data.items.length ? (
              <>
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
              </>
            ) : (
              <DataState title={t('reviews.empty.title')} text={t('reviews.empty.text')} />
            )}
          </section>
        </div>

        <aside className="sticky top-20 flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-6">
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

          <Card className="flex flex-col gap-3 p-6">
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

          <Card className="bg-surface-sunken flex flex-col gap-2 p-4">
            <h3 className="text-h3">{t('whatItDoes.title')}</h3>
            <p className="text-small">{t('whatItDoes.text')}</p>
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
              disabled={busy}
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
            <div className="flex flex-col gap-1.5">
              <ReasonPicker
                id="deactivate-reason"
                kind="deactivate"
                label={t('deactivate.reason')}
                value={reason}
                onChange={setReason}
              />
              <span className="text-ink-muted text-[13px]">{t('deactivate.reasonHint')}</span>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default AdminCustomerDetailPage;
