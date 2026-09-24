import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import CartGroup, { type CartLineType } from '@/components/CartGroup';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { farmerName, lineProduct, marketName, orders } from '@/data/customer';
import Notification from '@/utils/notification';

/** FR-035 — edit an order before its cutoff; saving returns it to Placed for the stall to approve again (D-07). */
const CustomerOrderEditPage = () => {
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
        <h1 className="text-h2">That order is not here any more</h1>
        <p className="text-ink-muted">You may have cancelled it, or the link is old. Open it again from your orders.</p>
        <ButtonLink to="/orders">My orders</ButtonLink>
      </div>
    );
  }

  const stallName = farmerName(order.farmerId);
  const href = `/orders/${code}`;

  const onSave = () => {
    Notification.success({ title: 'Changes sent', text: `${stallName} will review your order again.` });
    navigate(href);
  };

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/orders" className="text-brand underline">
          My orders
        </Link>{' '}
        ·{' '}
        <Link to={href} className="text-brand underline">
          Order {order.code}
        </Link>{' '}
        · Edit
      </p>

      <div className="flex flex-col gap-2">
        <h1 className="font-hand text-h1">Edit order {order.code}</h1>
        <p className="text-body">
          {stallName} · {order.date}, {order.slot}. Changes are allowed until <b>{order.cutoff}</b>.
        </p>
      </div>

      <Banner title={`After you save, the order goes back to Placed and ${stallName} approves it again.`}>
        Your stock stays reserved while they review. You get a notification when it is accepted.
      </Banner>

      <CartGroup
        stallName={stallName}
        where={`${marketName(order.marketId)} · ${order.date} · ${order.slot}`}
        items={items}
        onQtyChange={(id, qty) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)))}
        onRemove={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
      />

      <p className="text-small text-ink-muted">
        You can lower quantities or remove items here. To add something else from {stallName}, place a new order.
        Quantities are capped at what the stall has left today.
      </p>

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="note" className="text-small font-bold">
            Note to the stall
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
            Send changes for approval
          </Button>
          <ButtonLink to={href} variant="secondary">
            Discard changes
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
};

export default CustomerOrderEditPage;
