import { useTranslation } from 'react-i18next';
import OrderTicket from '@/components/OrderTicket';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { farmerName, orders } from '@/data/customer';
import { dayName, formatClock, formatDayMonth, formatTime } from '@/lib/format';
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
/** Lúc đặt đơn (demo) và hạn sửa/huỷ của từng đơn. */
const PLACED_AT = new Date(2026, 8, 24, 9, 12);
const CUTOFFS = [
  { time: '19:00', date: new Date(2026, 8, 25) },
  { time: '18:30', date: new Date(2026, 8, 26) },
];

/** FR-031 FR-032 — confirmation after placing pre-orders; stock is already held (D-02). */
const CustomerOrderPlacedPage = () => {
  const { t, i18n } = useTranslation('CustomerOrderPlaced');
  const list = (items: string[]) => new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(items);
  const stalls = list(placedOrders.map((o) => farmerName(o.farmerId)));
  const cutoffs = list(
    CUTOFFS.map((c) => t('steps.cutoffAt', { time: formatClock(c.time), date: formatDayMonth(c.date) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-155 flex-col gap-2">
        <p className="font-hand text-hand text-ink-muted">
          {dayName(PLACED_AT.getDay(), 'long')} {formatDayMonth(PLACED_AT)} · {formatTime(PLACED_AT)}
        </p>
        <h1 className="text-h1">{t('title', { count: placedOrders.length })}</h1>
        <p className="text-body-lg">{t('intro')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {placedOrders.map((o) => (
          <OrderTicket key={o.code} order={o} fluid hideActions />
        ))}
      </div>

      <Card className="flex max-w-155 flex-col gap-3 p-6">
        <h2 className="text-h3">{t('steps.title')}</h2>
        <ol className="text-body m-0 flex list-decimal flex-col gap-1.5 pl-5">
          <li>{t('steps.review', { stalls })}</li>
          <li>{t('steps.edit', { cutoffs })}</li>
          <li>{t('steps.pickup')}</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/orders">{t('seeOrders')}</ButtonLink>
          <ButtonLink to="/products" variant="secondary">
            {t('keepBrowsing')}
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
};

export default CustomerOrderPlacedPage;
