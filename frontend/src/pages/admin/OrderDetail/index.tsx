import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import OrderApi, { type OrderItemDto } from '@/api-requests/order.requests';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { Banner } from '@/components/ui/banner';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/data-state';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_CUSTOMERS_PATH, ADMIN_FARMERS_PATH, ADMIN_ORDERS_PATH } from '@/constants/nav';
import { ORDER_STATUS_META } from '@/constants/orderStatus';
import useRequest from '@/hooks/useRequest';
import { cutoffLabel, formatDate, formatTime, pickupLabel, units, money } from '@/lib/format';
import Helper from '@/utils/helper';

/** 403 (should not happen for an admin, Task 1.4) and 404 read the same: the order is not here to show. */
const isGone = (error: unknown) =>
  isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404);

/** An ISO instant (history entries) as the reader's date and time. */
const when = (iso: string) => {
  const at = new Date(iso);
  return `${formatDate(at)} ${formatTime(at)}`;
};

/**
 * FR-070 / FR-038 — one order, read-only. D-04 gives the stall the transitions and the customer the cancel before
 * cutoff; an admin is not in that list, so this screen reads and does not touch.
 */
const AdminOrderDetailPage = () => {
  const { t } = useTranslation('AdminOrderDetail');
  const { t: tc } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const id = /^\d+$/.test(code ?? '') ? Number(code) : null;

  const { state, retry } = useRequest(`admin-order:${id ?? 'none'}`, () =>
    id === null ? Promise.reject(new Error('not an order id')) : OrderApi.get(id),
  );
  const order = state.kind === 'ready' ? state.data : null;

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
        <ButtonLink to={ADMIN_ORDERS_PATH}>{t('allOrders')}</ButtonLink>
      </div>
    );
  }

  if (state.kind === 'error' || !order) {
    return <LoadError noun={t('noun')} onRetry={retry} />;
  }
  const s = order.summary;
  const buyer = order.customer;
  const placed = order.statusHistory[0];

  const columns: TableColumn<OrderItemDto>[] = [
    { key: 'name', label: t('col.product'), render: (line) => <b>{line.productName}</b> },
    { key: 'qty', label: t('col.quantity'), align: 'num', render: (line) => units(line.quantity, line.unit) },
    {
      key: 'price',
      label: t('col.unitPrice'),
      align: 'num',
      render: (line) => (
        <>
          {money(line.unitPrice)} <span className="text-ink-muted font-normal">/ {line.unit}</span>
        </>
      ),
    },
    { key: 'line', label: t('col.lineTotal'), align: 'num', render: (line) => money(line.subtotal) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to={ADMIN_ORDERS_PATH} className="text-brand underline">
          {t('allOrders')}
        </Link>{' '}
        · {s.orderCode}
      </p>

      <div className="flex flex-col gap-2">
        <p className="text-overline text-ink-muted uppercase">
          {t('kicker', { placed: placed ? when(placed.changedAt) : '—', cutoff: cutoffLabel(s.cutoffAt) })}
        </p>
        <h1 className="text-h2 text-ink font-bold">
          {s.orderCode} · {s.stallName}
          {buyer ? ` · ${buyer.fullName}` : ''}
        </h1>
        <div>
          <OrderStatusBadge status={s.status} />
        </div>
      </div>

      <Banner variant="info" title={t('readOnly.title')}>
        {t('readOnly.text')}
      </Banner>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('items.title')}</h2>
            <Table columns={columns} rows={order.items} />
            {order.customerNote ? <p className="text-small">{order.customerNote}</p> : null}
            {s.status === 'declined' && order.farmerNote ? (
              <p className="text-small">{t('declined', { reason: order.farmerNote })}</p>
            ) : null}
            <p className="text-small text-ink-muted">{t('items.note')}</p>
          </section>

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
                      <time className="text-ink-muted mt-0.5 block text-[13px]">
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
            <p className="text-small text-ink-muted">{t('history.note')}</p>
          </section>
        </div>

        <aside className="sticky top-20 flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('stall.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('stall.stall')}</dt>
              <dd className="m-0">{s.stallName}</dd>
            </dl>
            <ButtonLink to={`${ADMIN_FARMERS_PATH}/${s.farmerId}`} variant="secondary" size="sm">
              {t('stall.record')}
            </ButtonLink>
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('customer.title')}</h2>
            {buyer ? (
              <>
                <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                  <dt className="text-ink-muted">{t('customer.name')}</dt>
                  <dd className="m-0">{buyer.fullName}</dd>
                  <dt className="text-ink-muted">{t('customer.phone')}</dt>
                  <dd className="m-0">{buyer.phone}</dd>
                </dl>
                <ButtonLink to={`${ADMIN_CUSTOMERS_PATH}/${buyer.userId}`} variant="secondary" size="sm">
                  {t('customer.record')}
                </ButtonLink>
              </>
            ) : (
              <p className="text-small text-ink-muted">{t('customer.hidden')}</p>
            )}
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('pickup.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('pickup.market')}</dt>
              <dd className="m-0">{s.marketName}</dd>
              <dt className="text-ink-muted">{t('pickup.slot')}</dt>
              <dd className="m-0">{pickupLabel(s.pickupDate, `${s.pickupStart}–${s.pickupEnd}`)}</dd>
              <dt className="text-ink-muted">{t('pickup.cutoff')}</dt>
              <dd className="m-0">{cutoffLabel(s.cutoffAt)}</dd>
              <dt className="text-ink-muted">{t('pickup.total')}</dt>
              <dd className="m-0">{money(s.totalAmount)}</dd>
            </dl>
          </Card>

          <Card className="bg-surface-sunken flex flex-col gap-2 p-4">
            <h3 className="text-h3">{t('noButtons.title')}</h3>
            <p className="text-small">{t('noButtons.text')}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default AdminOrderDetailPage;
