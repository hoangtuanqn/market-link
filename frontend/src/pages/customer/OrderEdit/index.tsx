import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import CartGroup, { type CartLineType } from '@/components/CartGroup';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { farmerName, lineProduct, marketName, orders } from '@/data/customer';
import Notification from '@/utils/notification';

/** FR-035 — edit an order before its cutoff; saving returns it to Placed for the stall to approve again (D-07). */
const CustomerOrderEditPage = () => {
  const { t } = useTranslation('CustomerOrderEdit');
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const order = orders.find((o) => o.code.replace('#', '') === code);
  const [items, setItems] = useState<CartLineType[]>(
    () =>
      order?.items
        .map((line) => {
          const p = lineProduct(line.productId);
          return p ? { id: p.id, name: p.name, unit: p.unit, price: p.price, max: line.qty, qty: line.qty } : null;
        })
        .filter((i): i is CartLineType => i != null) ?? [],
  );
  const [note, setNote] = useState('Please pick the smaller bunches if you can.');

  if (!order) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('notFound.title')}</h1>
        <p className="text-ink-muted">{t('notFound.text')}</p>
        <ButtonLink to="/orders">{t('myOrders')}</ButtonLink>
      </div>
    );
  }

  const href = `/orders/${code}`;

  /**
   * FR-035 — the form itself is the guard, not just the button that leads here: after the cutoff, or once the stall has
   * moved the order past `accepted`, typing this URL must not produce a "Send changes" button.
   */
  if (order.locked || (order.status !== 'placed' && order.status !== 'accepted')) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('notChangeable.title')}</h1>
        <p className="text-ink-muted">{t('notChangeable.text')}</p>
        <ButtonLink to={href}>{t('breadcrumbOrder', { code: order.code })}</ButtonLink>
      </div>
    );
  }

  const stallName = farmerName(order.farmerId);

  const onSave = () => {
    Notification.success({ title: t('toast.title'), text: t('toast.text', { stall: stallName }) });
    navigate(href);
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
          {stallName} · {order.date}, {order.slot}.{' '}
          <Trans t={t} i18nKey="cutoff" values={{ cutoff: order.cutoff }} components={{ b: <b /> }} />
        </p>
      </div>

      <Banner title={t('banner.title', { stall: stallName })}>{t('banner.text')}</Banner>

      <CartGroup
        stallName={stallName}
        where={`${marketName(order.marketId)} · ${order.date} · ${order.slot}`}
        items={items}
        onQtyChange={(id, qty) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)))}
        onRemove={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
      />

      <p className="text-small text-ink-muted">{t('help', { stall: stallName })}</p>

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="note" className="text-small font-bold">
            {t('note')}
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="border-line-strong bg-surface-raised text-body min-h-16 rounded-sm border-[1.5px] p-3"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onSave} disabled={items.length === 0}>
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
