import { isAxiosError } from 'axios';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import OrderApi, { toOrder } from '@/api-requests/order.requests';
import CartGroup from '@/components/CartGroup';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import { cutoffLabel, pickupLabel } from '@/lib/format';
import type { OrderLineType } from '@/types/order.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

/** 403 (someone else's order) and 404 read the same to the customer: the order is not theirs to edit. */
const isGone = (error: unknown) =>
  isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404);

/** FR-035 — edit an order before its cutoff; saving returns it to Placed for the stall to approve again (D-07). */
const CustomerOrderEditPage = () => {
  const { t } = useTranslation('CustomerOrderEdit');
  const { t: tc } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const id = /^\d+$/.test(code ?? '') ? Number(code) : null;

  const { state, retry } = useRequest(`order:${id ?? 'none'}`, () =>
    id === null ? Promise.reject(new Error('not an order id')) : OrderApi.get(id),
  );
  const data = state.kind === 'ready' ? state.data : null;

  // "Mirror-until-edited": every line starts at its order quantity; only lines the customer touched get an entry
  // here. Never written from inside an effect — it is the source of truth for what the customer changed.
  const [edits, setEdits] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

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
        <h1 className="text-h2">{t('notFound.title')}</h1>
        <p className="text-ink-muted">{t('notFound.text')}</p>
        <ButtonLink to="/orders">{t('myOrders')}</ButtonLink>
      </div>
    );
  }

  if (state.kind === 'error' || !data) {
    return <LoadError noun={t('noun')} onRetry={retry} />;
  }

  const order = toOrder(data);
  const href = `/orders/${order.id}`;

  /**
   * FR-035 — the form itself is the guard, not just the button that leads here: after the cutoff, or once the stall has
   * moved the order past `accepted`, typing this URL must not produce a "Send changes" button.
   */
  if (!data.canModify) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('notChangeable.title')}</h1>
        <p className="text-ink-muted">{t('notChangeable.text')}</p>
        <ButtonLink to={href}>{t('breadcrumbOrder', { code: order.code })}</ButtonLink>
      </div>
    );
  }

  const stallName = order.stallName ?? '';
  const qtyOf = (line: OrderLineType) => edits[line.productId] ?? line.qty;
  // A line edited down to 0 is a removal, not a quantity — it drops out of the list and out of the save payload.
  const visibleItems = order.items
    .filter((line) => qtyOf(line) > 0)
    .map((line) => ({
      id: line.productId,
      name: line.name ?? '',
      unit: line.unit ?? '',
      price: line.price ?? 0,
      // The stock left is not known here; let the stepper go 20 above the current quantity and let the server be
      // the judge (409 OUT_OF_STOCK) — FR-035 never adds a new product, only raises or lowers an existing line.
      max: qtyOf(line) + 20,
      qty: qtyOf(line),
    }));

  const onSave = async () => {
    if (order.id == null) return;
    setSaving(true);
    try {
      const items = order.items
        .map((line) => ({ productId: line.productId, quantity: qtyOf(line) }))
        .filter((line) => line.quantity > 0);
      await OrderApi.modifyItems(order.id, items);
      Notification.success({ title: t('toast.title'), text: t('toast.text', { stall: stallName }) });
      navigate(href);
    } catch (error) {
      // Keep the edits on failure (e.g. 409 OUT_OF_STOCK) so the customer does not have to redo them.
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/orders" className="text-brand underline">
          {t('myOrders')}
        </Link>{' '}
        ·{' '}
        <Link to={href} className="text-brand underline">
          {t('breadcrumbOrder', { code: order.code })}
        </Link>{' '}
        · {t('breadcrumbEdit')}
      </p>

      <div className="flex flex-col gap-2">
        <h1 className="font-hand text-h1">{t('title', { code: order.code })}</h1>
        <p className="text-body">
          {stallName} · {pickupLabel(order.date, order.slot)}.{' '}
          <Trans t={t} i18nKey="cutoff" values={{ cutoff: cutoffLabel(order.cutoff) }} components={{ b: <b /> }} />
        </p>
      </div>

      <Banner title={t('banner.title', { stall: stallName })}>{t('banner.text')}</Banner>

      <CartGroup
        stallName={stallName}
        where={`${order.marketName ?? ''} · ${pickupLabel(order.date, order.slot)}`}
        items={visibleItems}
        onQtyChange={(productId, qty) => setEdits((prev) => ({ ...prev, [productId]: qty }))}
        onRemove={(productId) => setEdits((prev) => ({ ...prev, [productId]: 0 }))}
      />

      <p className="text-small text-ink-muted">{t('help', { stall: stallName })}</p>

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void onSave()} disabled={visibleItems.length === 0 || saving}>
            {t('submit')}
          </Button>
          <ButtonLink to={href} variant="secondary">
            {t('discard')}
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
};

export default CustomerOrderEditPage;
