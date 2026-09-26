import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { ButtonLink } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { Card } from '@/components/ui/card';
import { Table, type TableColumn } from '@/components/ui/table';
import { ORDER_STATUS_META } from '@/constants/orderStatus';
import { ADMIN_CUSTOMERS_PATH, ADMIN_FARMERS_PATH, ADMIN_ORDERS_PATH } from '@/constants/nav';
import { customers } from '@/data/admin';
import { farmer, product } from '@/data/catalog';
import { marketName, orderTotal, orders } from '@/data/customer';
import { units, vnd } from '@/lib/format';
import type { OrderLineType } from '@/types/order.types';
import Helper from '@/utils/helper';

/**
 * FR-070 / FR-038 — one order, read-only. D-04 gives the stall the transitions and the customer the cancel before
 * cutoff; an admin is not in that list, so this screen reads and does not touch.
 */
const AdminOrderDetailPage = () => {
  const { t } = useTranslation('AdminOrderDetail');
  const { code } = useParams<{ code: string }>();
  const index = orders.findIndex((o) => o.code.replace('#', '') === code);
  const order = index >= 0 ? orders[index] : undefined;

  if (!order) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('missing.title')}</h1>
        <p className="text-ink-muted">{t('missing.text')}</p>
        <ButtonLink to={ADMIN_ORDERS_PATH}>{t('allOrders')}</ButtonLink>
      </div>
    );
  }

  const stall = farmer(order.farmerId);
  // No customer table yet, so the demo list stands in. Picking by index keeps the same order showing the same person.
  const buyer = customers[index % customers.length];
  const [placed] = order.history;

  const columns: TableColumn<OrderLineType>[] = [
    {
      key: 'name',
      label: t('col.product'),
      render: (line) => {
        const p = product(line.productId);
        return (
          <>
            <b>{p?.name}</b>
            <span className="text-ink-muted block text-[13px]">{p?.category}</span>
          </>
        );
      },
    },
    {
      key: 'qty',
      label: t('col.quantity'),
      align: 'num',
      render: (line) => units(line.qty, product(line.productId)?.unit, product(line.productId)?.plural),
    },
    {
      key: 'price',
      label: t('col.unitPrice'),
      align: 'num',
      render: (line) => {
        const p = product(line.productId);
        return (
          <>
            {vnd(p?.price ?? 0)} <span className="text-ink-muted font-normal">/ {p?.unit}</span>
          </>
        );
      },
    },
    {
      key: 'line',
      label: t('col.lineTotal'),
      align: 'num',
      render: (line) => vnd((product(line.productId)?.price ?? 0) * line.qty),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to={ADMIN_ORDERS_PATH} className="text-brand underline">
          {t('allOrders')}
        </Link>{' '}
        · {order.code}
      </p>

      <div className="flex flex-col gap-2">
        <p className="text-overline text-ink-muted uppercase">
          {t('kicker', { placed: placed?.[1], cutoff: order.cutoff })}
        </p>
        <h1 className="text-h2">
          {order.code} · {stall?.stall} · {buyer.name}
        </h1>
        <div>
          <OrderStatusBadge status={order.status} />
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
            <p className="text-small text-ink-muted">{t('items.note')}</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('history.title')}</h2>
            <ol className="m-0 flex flex-col p-0">
              {order.history.map(([status, time, by], i) => {
                const Icon = ORDER_STATUS_META[status].icon;
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
                        ORDER_STATUS_META[status].className,
                      )}
                    >
                      <Icon size={14} />
                    </span>
                    <div>
                      <OrderStatusBadge status={status} />
                      <time className="text-ink-muted mt-0.5 block text-[13px]">{t('history.by', { time, by })}</time>
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
              <dd className="m-0">{stall?.stall}</dd>
              <dt className="text-ink-muted">{t('stall.contact')}</dt>
              <dd className="m-0">
                {stall?.person} · {stall?.phone}
              </dd>
              <dt className="text-ink-muted">{t('stall.approval')}</dt>
              <dd className="m-0">{stall && t(`approval.${stall.approval}`)}</dd>
            </dl>
            <ButtonLink to={`${ADMIN_FARMERS_PATH}/${order.farmerId}`} variant="secondary" size="sm">
              {t('stall.record')}
            </ButtonLink>
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('customer.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('customer.name')}</dt>
              <dd className="m-0">{buyer.name}</dd>
              <dt className="text-ink-muted">{t('customer.phone')}</dt>
              <dd className="m-0">{buyer.phone}</dd>
              <dt className="text-ink-muted">{t('customer.orders')}</dt>
              <dd className="m-0">{buyer.orders}</dd>
            </dl>
            <ButtonLink to={`${ADMIN_CUSTOMERS_PATH}/${buyer.id}`} variant="secondary" size="sm">
              {t('customer.record')}
            </ButtonLink>
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('pickup.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('pickup.market')}</dt>
              <dd className="m-0">{marketName(order.marketId)}</dd>
              <dt className="text-ink-muted">{t('pickup.slot')}</dt>
              <dd className="m-0">
                {order.date} · {order.slot}
              </dd>
              <dt className="text-ink-muted">{t('pickup.cutoff')}</dt>
              <dd className="m-0">{order.cutoff}</dd>
              <dt className="text-ink-muted">{t('pickup.total')}</dt>
              <dd className="m-0">{vnd(orderTotal(order))}</dd>
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
