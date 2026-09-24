import OrderTicket from '@/components/OrderTicket';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { orders } from '@/data/customer';
import type { OrderType } from '@/types/order.types';

const order1: OrderType = {
  ...orders.find((o) => o.code === '#ML-0421')!,
  items: [
    { productId: 1, qty: 2 },
    { productId: 2, qty: 1 },
  ],
};
const order2: OrderType = {
  code: '#ML-0422',
  farmerId: 2,
  marketId: 2,
  date: 'Sun 27/09/2026',
  slot: '06:30–07:00',
  status: 'placed',
  cutoff: '18:30 26/09',
  items: [{ productId: 3, qty: 2 }],
  history: [['placed', '24/09/2026 09:12', 'You']],
};
const placedOrders = [order1, order2];

/** FR-031 FR-032 — confirmation after placing pre-orders; stock is already held (D-02). */
const CustomerOrderPlacedPage = () => (
  <div className="flex flex-col gap-6">
    <div className="flex max-w-155 flex-col gap-2">
      <p className="font-hand text-hand text-ink-muted">Thursday 24/09 · 09:12</p>
      <h1 className="text-h1">{placedOrders.length} orders placed</h1>
      <p className="text-body-lg">
        Each stall now reviews its order. You get a notification when it is accepted, and another when it is ready to
        pick up. Stock is already held for you.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {placedOrders.map((o) => (
        <OrderTicket key={o.code} order={o} fluid hideActions />
      ))}
    </div>

    <Card className="flex max-w-155 flex-col gap-3 p-6">
      <h2 className="text-h3">What happens next</h2>
      <ol className="text-body m-0 flex list-decimal flex-col gap-1.5 pl-5">
        <li>Cô Tư Garden and Út Hiền Orchard accept or decline before their cutoff.</li>
        <li>You can edit or cancel each order until its cutoff: 19:00 on 25/09 and 18:30 on 26/09.</li>
        <li>On market day the stall marks it ready. Go in your slot, collect and pay the Farmer.</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <ButtonLink to="/orders">See my orders</ButtonLink>
        <ButtonLink to="/products" variant="secondary">
          Keep browsing
        </ButtonLink>
      </div>
    </Card>
  </div>
);

export default CustomerOrderPlacedPage;
