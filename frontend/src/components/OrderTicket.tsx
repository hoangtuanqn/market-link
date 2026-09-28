import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import OrderApi, { toOrder } from '@/api-requests/order.requests';
import ProductApi from '@/api-requests/product.requests';
import BestBeforeLine from '@/components/BestBeforeLine';
import { CircleSlashIcon, ClockIcon, CloseIcon, LockIcon } from '@/components/icons';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Cart } from '@/lib/cart';
import { cutoffLabel, pickupLabel, money } from '@/lib/format';
import type { OrderType } from '@/types/order.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type OrderTicketProps = {
  order: OrderType;
  fluid?: boolean;
  hideActions?: boolean;
  onChanged?: (order: OrderType) => void;
};

const total = (o: OrderType) => o.total ?? o.items.reduce((s, l) => s + l.qty * (l.price ?? 0), 0);

/** Order receipt: pickup details, items, total and the actions for its current status (design system `.ml-ticket`). */
const OrderTicket = ({ order, fluid, hideActions, onChanged }: OrderTicketProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const editable = !order.locked && (order.status === 'placed' || order.status === 'accepted');
  // By id, never by code: the detail, edit and review pages all read the route param as a number.
  const href = `/orders/${order.id}`;

  const cancel = async () => {
    if (order.id == null) return;
    setBusy(true);
    try {
      const updated = toOrder(await OrderApi.cancel(order.id));
      onChanged?.(updated);
      Notification.success({ text: t('order.cancelledToast', { code: order.code }) });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, t('errors.network')) });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const reorder = async () => {
    if (order.id == null) return;
    setBusy(true);
    try {
      const lines = await OrderApi.reorder(order.id);
      const products = await Promise.all(lines.map((l) => ProductApi.get(l.productId)));
      products.forEach((p, i) =>
        Cart.add(
          {
            productId: p.product.id,
            name: p.product.name,
            unit: p.product.unit,
            price: Number(p.product.price),
            max: p.product.stockQuantity,
            farmerId: p.product.farmerId,
            stallName: p.product.stallName,
          },
          lines[i].quantity,
        ),
      );
      const dropped = (order.itemCount ?? order.items.length) - lines.length;
      Notification.success({
        text: dropped > 0 ? t('order.reorderedPartly', { count: dropped }) : t('order.reordered'),
      });
      navigate('/cart');
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, t('errors.network')) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card as="article" className={Helper.cn('flex h-full flex-col gap-3 p-4', fluid ? 'w-full' : 'w-95 max-w-full')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-ink-muted text-small">{t('order.code', { code: order.code })}</div>
          <h3 className="mt-0.5 text-[17px] leading-tight font-bold">
            <Link to={href} className="text-inherit no-underline hover:underline hover:underline-offset-3">
              {order.stallName ?? ''}
            </Link>
          </h3>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <dl className="bg-surface-sunken text-small m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-sm p-3">
        <dt className="text-ink-muted">{t('order.market')}</dt>
        <dd className="m-0 font-bold">{order.marketName ?? ''}</dd>
        <dt className="text-ink-muted">{t('order.pickup')}</dt>
        <dd className="m-0 font-bold">{pickupLabel(order.date, order.slot)}</dd>
      </dl>

      <div className="ml-ticket-perf" aria-hidden="true" />

      <ul className="m-0 flex flex-1 flex-col p-0 text-[15px]">
        {order.items.length > 0 ? (
          order.items.map((line) => (
            <li
              key={line.productId}
              className="border-line-strong flex justify-between gap-3 border-b border-dotted py-1.5 last:border-b-0"
            >
              <span className="min-w-0">
                <span className="text-ink-muted mr-1.5 tabular-nums">{line.qty}×</span>
                {line.name}
                {/* FR-121 (spec §4.3): the promise under each line, as on both order detail pages */}
                <BestBeforeLine bestBefore={line.bestBefore} storageMode={line.storageMode} />
              </span>
              <span className="whitespace-nowrap tabular-nums">{money(line.qty * (line.price ?? 0))}</span>
            </li>
          ))
        ) : (
          <li className="border-line-strong flex justify-between gap-3 border-b border-dotted py-1.5 last:border-b-0">
            {t('order.itemCount', { count: order.itemCount ?? 0 })}
          </li>
        )}
      </ul>

      <div className="flex items-baseline justify-between gap-3 font-bold">
        <span>{t('order.payOnPickup')}</span>
        <span className="font-hand text-price text-[28px] tabular-nums">{money(total(order))}</span>
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
                ? t('order.lockedNote', { cutoff: cutoffLabel(order.cutoff) })
                : t('order.editableNote', { cutoff: cutoffLabel(order.cutoff) })}
            </span>
          </p>
        )}

        {!hideActions && editable && (
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={`${href}/edit`} variant="secondary" size="sm">
              {t('order.edit')}
            </ButtonLink>
            <Button variant="danger" size="sm" disabled={busy} onClick={() => setConfirming(true)}>
              {t('order.cancel')}
            </Button>
          </div>
        )}
        {!hideActions && order.status === 'completed' && (
          <div className="flex flex-wrap items-center gap-2">
            {order.reviewed ? (
              <span className="text-ink-muted text-small">{t('order.reviewed')}</span>
            ) : (
              <ButtonLink to={`${href}/review`} size="sm">
                {t('order.review')}
              </ButtonLink>
            )}
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void reorder()}>
              {t('order.reorder')}
            </Button>
          </div>
        )}
      </div>

      <Dialog
        open={confirming}
        tone="danger"
        title={t('order.cancelConfirmTitle')}
        onClose={() => setConfirming(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {t('actions.dismiss')}
            </Button>
            <Button variant="dangerFill" disabled={busy} onClick={() => void cancel()}>
              {t('order.cancel')}
            </Button>
          </>
        }
      >
        <p>{t('order.cancelConfirmText')}</p>
      </Dialog>
    </Card>
  );
};

export default OrderTicket;
