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

const isGone = (error: unknown) =>
  isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404);

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

  const { state: leftLoad } = useRequest(`order-edit-left:${data ? data.summary.orderId : 'none'}`, () =>
    data
      ? OrderApi.preview(
          data.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          [{ farmerId: data.summary.farmerId, date: data.summary.pickupDate }],
        )
      : Promise.resolve([]),
  );
  const leftOf = (productId: number) => {
    const line =
      leftLoad.kind === 'ready'
        ? leftLoad.data.flatMap((g) => g.items).find((i) => i.productId === productId)
        : undefined;
    return line && line.status === 'available' ? Math.max(0, line.stockQuantity) : 0;
  };

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
  const visibleItems = order.items
    .filter((line) => qtyOf(line) > 0)
    .map((line) => ({
      id: line.productId,
      name: line.name ?? '',
      unit: line.unit ?? '',
      price: line.price ?? 0,
      max: line.qty + leftOf(line.productId),
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
