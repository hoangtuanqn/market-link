import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import ReviewCard from '@/components/ReviewCard';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_CUSTOMERS_PATH, ADMIN_MODERATION_PATH, ADMIN_ORDERS_PATH } from '@/constants/nav';
import { ORDER_STATUS_META } from '@/constants/orderStatus';
import { adminCustomer, customerDetail, customerTimeline } from '@/data/admin';
import { reviews } from '@/data/catalog';
import { farmerName, marketName, orderTotal, orders } from '@/data/customer';
import { vnd } from '@/lib/format';
import type { OrderType } from '@/types/order.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import { CustomerStatusPill } from '@/pages/admin/Customers';

/** Reasons an admin picks from when deactivating an account. Keys resolve under `reason.` in the locale file. */
const REASONS = ['noShows', 'abusive', 'requested', 'other'] as const;

/**
 * FR-072 — one customer: their orders across every stall, the reviews they wrote, and the account history. Orders are
 * read-only (D-04); the only action here is deactivating or reactivating the account.
 */
const AdminCustomerDetailPage = () => {
  const { t } = useTranslation('AdminCustomerDetail');
  const { id } = useParams<{ id: string }>();
  const customer = adminCustomer(Number(id));

  const [deactivated, setDeactivated] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [savedReason, setSavedReason] = useState('');

  if (!customer) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('missing.title')}</h1>
        <p className="text-ink-muted">{t('missing.text')}</p>
        <ButtonLink to={ADMIN_CUSTOMERS_PATH}>{t('allCustomers')}</ButtonLink>
      </div>
    );
  }

  const detail = customerDetail[customer.id] ?? customerDetail[1];
  const active = customer.status === 'active' && !deactivated;
  const theirOrders = orders.slice(0, 4);
  const theirReviews = reviews.slice(0, 2);

  const confirm = () => {
    const picked = reason || t(`reason.${REASONS[0]}`);
    setDeactivated(true);
    setSavedReason(picked);
    setDialogOpen(false);
    Notification.success({ text: t('toast.deactivated', { name: customer.name }) });
  };

  const columns: TableColumn<OrderType>[] = [
    {
      key: 'code',
      label: t('col.order'),
      render: (o) => (
        <Link to={`${ADMIN_ORDERS_PATH}/${o.code.replace('#', '')}`} className="text-brand underline">
          {o.code}
        </Link>
      ),
    },
    {
      key: 'stall',
      label: t('col.stall'),
      render: (o) => (
        <>
          {farmerName(o.farmerId)}
          <span className="text-ink-muted block text-[13px]">{marketName(o.marketId)}</span>
        </>
      ),
    },
    { key: 'slot', label: t('col.pickup'), render: (o) => `${o.date} · ${o.slot}` },
    { key: 'items', label: t('col.items'), align: 'num', render: (o) => o.items.length },
    { key: 'total', label: t('col.total'), align: 'num', render: (o) => vnd(orderTotal(o)) },
    { key: 'status', label: t('col.status'), render: (o) => <OrderStatusBadge status={o.status} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to={ADMIN_CUSTOMERS_PATH} className="text-brand underline">
          {t('allCustomers')}
        </Link>{' '}
        · {customer.name}
      </p>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-overline text-ink-muted uppercase">
            {t('since', { joined: customer.joined, last: detail.lastOrder })}
          </p>
          <h1 className="text-h2">{customer.name}</h1>
          <div>
            <CustomerStatusPill active={active} />
          </div>
        </div>
        {active ? (
          <Button variant="danger" onClick={() => setDialogOpen(true)}>
            {t('action.deactivate')}
          </Button>
        ) : (
          <Button onClick={() => Notification.success({ text: t('toast.reactivated', { name: customer.name }) })}>
            {t('action.reactivate')}
          </Button>
        )}
      </div>

      {deactivated && (
        <Banner variant="warning" title={t('banner.title')}>
          {t('banner.text', { reason: savedReason })}
        </Banner>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-h2">{t('orders.title')}</h2>
              <Link to={ADMIN_ORDERS_PATH} className="text-brand text-small underline">
                {t('orders.all')}
              </Link>
            </div>
            <Table columns={columns} rows={theirOrders} />
            <p className="text-small text-ink-muted">{t('orders.note')}</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('reviews.title')}</h2>
            {theirReviews.map((r) => (
              <ReviewCard
                key={r.id}
                author={r.author}
                date={r.date}
                target={r.target}
                rating={r.rating}
                text={r.text}
                reply={r.reply}
                fluid
                actions={
                  <ButtonLink to={ADMIN_MODERATION_PATH} variant="ghost" size="sm">
                    {t('reviews.openInModeration')}
                  </ButtonLink>
                }
              />
            ))}
            <p className="text-small text-ink-muted">{t('reviews.note')}</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('timeline.title')}</h2>
            <ol className="m-0 flex flex-col p-0">
              {customerTimeline.map((event, i) => {
                const Icon = ORDER_STATUS_META[event.status].icon;
                return (
                  <li key={event.titleKey} className="relative grid grid-cols-[28px_1fr] items-start gap-3 py-2">
                    {i > 0 && (
                      <span
                        aria-hidden="true"
                        className="border-line-strong absolute top-[-8px] left-[13px] h-4 border-l-2 border-dotted"
                      />
                    )}
                    <span
                      className={Helper.cn(
                        'grid size-7 flex-none place-items-center rounded-full',
                        ORDER_STATUS_META[event.status].className,
                      )}
                    >
                      <Icon size={14} />
                    </span>
                    <div>
                      <b>{t(`timeline.${event.titleKey}`)}</b>
                      <time className="text-ink-muted mt-0.5 block text-[13px]">
                        {event.time} · {event.detail}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="sticky top-20 flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('contact.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('contact.email')}</dt>
              <dd className="m-0 break-all">{customer.email}</dd>
              <dt className="text-ink-muted">{t('contact.phone')}</dt>
              <dd className="m-0">{customer.phone}</dd>
              <dt className="text-ink-muted">{t('contact.address')}</dt>
              <dd className="m-0">{detail.address}</dd>
              <dt className="text-ink-muted">{t('contact.joined')}</dt>
              <dd className="m-0">{customer.joined}</dd>
            </dl>
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('habits.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('habits.orders')}</dt>
              <dd className="m-0">{customer.orders}</dd>
              <dt className="text-ink-muted">{t('habits.collected')}</dt>
              <dd className="m-0">{detail.collected}</dd>
              <dt className="text-ink-muted">{t('habits.noShows')}</dt>
              <dd className="m-0">
                {detail.noShows} · {detail.noShowDate}
              </dd>
              <dt className="text-ink-muted">{t('habits.market')}</dt>
              <dd className="m-0">{detail.market}</dd>
              <dt className="text-ink-muted">{t('habits.buysMostFrom')}</dt>
              <dd className="m-0">{detail.buysMostFrom}</dd>
            </dl>
          </Card>

          <Card className="bg-surface-sunken flex flex-col gap-2 p-4">
            <h3 className="text-h3">{t('whatItDoes.title')}</h3>
            <p className="text-small">{t('whatItDoes.text')}</p>
          </Card>
        </aside>
      </div>

      <Dialog
        open={dialogOpen}
        tone="danger"
        title={t('deactivate.title', { name: customer.name })}
        onClose={() => setDialogOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              {t('deactivate.keep')}
            </Button>
            <Button variant="danger" onClick={confirm}>
              {t('deactivate.confirm')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{t('deactivate.text')}</p>
          <SelectField
            id="deactivate-reason"
            label={t('deactivate.reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            options={REASONS.map((key) => t(`reason.${key}`))}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default AdminCustomerDetailPage;
