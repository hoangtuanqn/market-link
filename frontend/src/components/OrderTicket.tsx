import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CircleSlashIcon, ClockIcon, CloseIcon, LockIcon } from '@/components/icons';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { farmerName, lineProduct, marketName, orderTotal } from '@/data/customer';
import { vnd } from '@/lib/format';
import type { OrderType } from '@/types/order.types';
import Helper from '@/utils/helper';

type OrderTicketProps = { order: OrderType; fluid?: boolean; hideActions?: boolean };

/** Order receipt: pickup details, items, total and the actions for its current status (design system `.ml-ticket`). */
const OrderTicket = ({ order, fluid, hideActions }: OrderTicketProps) => {
  const { t } = useTranslation();
  const editable = !order.locked && (order.status === 'placed' || order.status === 'accepted');
  const href = `/orders/${order.code.replace('#', '')}`;

  return (
    <Card as="article" className={Helper.cn('flex h-full flex-col gap-3 p-4', fluid ? 'w-full' : 'w-95 max-w-full')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-ink-muted text-small">{t('order.code', { code: order.code })}</div>
          <h3 className="mt-0.5 text-[17px] leading-tight font-bold">
            <Link to={href} className="text-inherit no-underline hover:underline hover:underline-offset-3">
              {farmerName(order.farmerId)}
            </Link>
          </h3>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <dl className="bg-surface-sunken text-small m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-sm p-3">
        <dt className="text-ink-muted">{t('order.market')}</dt>
        <dd className="m-0 font-bold">{marketName(order.marketId)}</dd>
        <dt className="text-ink-muted">{t('order.pickup')}</dt>
        <dd className="m-0 font-bold">
          {order.date} · {order.slot}
        </dd>
      </dl>

      <div className="ml-ticket-perf" aria-hidden="true" />

      <ul className="m-0 flex flex-1 flex-col p-0 text-[15px]">
        {order.items.map((line) => {
          const p = lineProduct(line.productId);
          if (!p) return null;
          return (
            <li
              key={line.productId}
              className="border-line-strong flex justify-between gap-3 border-b border-dotted py-1.5 last:border-b-0"
            >
              <span>
                <span className="text-ink-muted mr-1.5 tabular-nums">{line.qty}×</span>
                {p.name}
              </span>
              <span className="whitespace-nowrap tabular-nums">{vnd(line.qty * p.price)}</span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-baseline justify-between gap-3 font-bold">
        <span>{t('order.payOnPickup')}</span>
        <span className="font-hand text-price text-[28px] tabular-nums">{vnd(orderTotal(order))}</span>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {order.status === 'declined' && order.reason ? (
          <p className="text-ink-muted m-0 flex items-start gap-1.5 text-[13px]">
            <CloseIcon size={16} className="mt-px flex-none" />
            <span>{t('order.declinedReason', { reason: order.reason })}</span>
          </p>
        ) : order.status === 'cancelled' ? (
          <p className="text-ink-muted m-0 flex items-start gap-1.5 text-[13px]">
            <CircleSlashIcon size={16} className="mt-px flex-none" />
            <span>{t('order.cancelledNote')}</span>
          </p>
        ) : (
          <p className="text-ink-muted m-0 flex items-start gap-1.5 text-[13px]">
            {order.locked ? (
              <LockIcon size={16} className="mt-px flex-none" />
            ) : (
              <ClockIcon size={16} className="mt-px flex-none" />
            )}
            <span>
              {order.locked
                ? t('order.lockedNote', { cutoff: order.cutoff })
                : t('order.editableNote', { cutoff: order.cutoff })}
            </span>
          </p>
        )}

        {!hideActions && editable && (
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={`${href}/edit`} variant="secondary" size="sm">
              {t('order.edit')}
            </ButtonLink>
            <Button variant="danger" size="sm">
              {t('order.cancel')}
            </Button>
          </div>
        )}
        {!hideActions &&
          order.status === 'completed' &&
          (order.reviewed ? (
            <span className="text-ink-muted text-small">{t('order.reviewed')}</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              <ButtonLink to={`${href}/review`} size="sm">
                {t('order.review')}
              </ButtonLink>
              <Button variant="ghost" size="sm">
                {t('order.reorder')}
              </Button>
            </div>
          ))}
      </div>
    </Card>
  );
};

export default OrderTicket;
