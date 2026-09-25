import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BarList } from '@/components/ui/bar-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ColumnChart } from '@/components/ui/column-chart';
import { Kpi } from '@/components/ui/kpi';
import { Pagination } from '@/components/ui/pagination';
import { PeriodBar } from '@/components/ui/period-bar';
import { SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { product } from '@/data/catalog';
import {
  bestSellerQty,
  farmerDayRevenue,
  farmerOrderTotal,
  farmerOrders,
  overviewSpark,
  revenueByMarket,
  type FarmerOrderType,
} from '@/data/farmer';
import { perUnit, unitName, units, vnd } from '@/lib/format';
import { clockRange, marketDay } from '@/pages/FarmerOrders/demoDates';
import type { OrderStatus } from '@/types/order.types';
import Notification from '@/utils/notification';

const PAST_STATUSES: OrderStatus[] = ['completed', 'declined', 'cancelled'];

/** The period on screen and the one it is compared with (the seeded figures are September against August 2026). */
const PERIOD = new Date(2026, 8, 1);
const PREVIOUS = new Date(2026, 7, 1);

/** FR-069 — what sold in September, how it compares with August, and the completed/declined/cancelled orders behind it. */
const FarmerHistoryPage = () => {
  const { t, i18n } = useTranslation('FarmerHistory');
  const month = (d: Date) => new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(d);
  const monthYear = (d: Date) => new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(d);
  const num = (n: number, digits = 0) =>
    new Intl.NumberFormat(i18n.language, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

  const pastOrders = farmerOrders.filter((o) => PAST_STATUSES.includes(o.status));

  const bestSellerRows = bestSellerQty.map(({ productId, qty }) => {
    const p = product(productId)!;
    return { label: p.name, value: qty * p.price };
  });

  const columns: TableColumn<FarmerOrderType>[] = [
    { key: 'd', label: t('col.pickup'), render: (r) => `${marketDay(r.date)} · ${clockRange(r.slot)}` },
    {
      key: 'code',
      label: t('col.order'),
      render: (r) => <Link to={`/farmer/orders/${r.code.replace('#', '')}`}>{r.code}</Link>,
    },
    { key: 'who', label: t('col.customer') },
    {
      key: 'i',
      label: t('col.items'),
      render: (r) =>
        new Intl.ListFormat(i18n.language, { style: 'narrow', type: 'unit' }).format(
          r.items.map((i) => t('itemLine', { qty: num(i.qty), name: product(i.productId)?.name ?? '' })),
        ),
    },
    { key: 't', label: t('col.total'), align: 'num', render: (r) => vnd(farmerOrderTotal(r)) },
    { key: 's', label: t('col.status'), render: (r) => <OrderStatusBadge status={r.status} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            Notification.success({
              title: t('export.title'),
              text: t('export.text'),
            })
          }
        >
          {t('export.button')}
        </Button>
      </div>

      <PeriodBar label={monthYear(PERIOD)} days={t('days', { count: 30 })} compare={monthYear(PREVIOUS)} />

      <SelectField
        id="mk"
        label={t('market')}
        className="max-w-80"
        options={[t('bothMarkets'), 'Thảo Điền Weekend Market', 'Thủ Đức Farmers Market']}
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi
          label={t('kpi.completed')}
          value={num(112)}
          note={t('kpi.completedNote', { total: num(128) })}
          delta={{ pct: 18.9 }}
        />
        <Kpi
          label={t('kpi.revenue')}
          value={num(8450000)}
          note={t('kpi.revenueNote')}
          delta={{ pct: 21.4 }}
          highlight
          spark={overviewSpark.revenue}
        />
        <Kpi label={t('kpi.average')} value={num(75400)} note={t('kpi.averageNote')} delta={{ pct: 2.1 }} />
        <Kpi
          label={t('kpi.declined')}
          value={num(6)}
          note={t('kpi.declinedNote', { pct: num(4.7, 1) })}
          delta={{ pct: 1.4, good: false }}
        />
      </div>

      <Card className="flex flex-col gap-3 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3">{t('byDay.title')}</h2>
          <p className="text-small text-ink-muted">{t('byDay.note')}</p>
        </div>
        <ColumnChart
          caption={t('byDay.caption', { now: month(PERIOD), prev: month(PREVIOUS) })}
          labels={farmerDayRevenue.labels.map(marketDay)}
          series={[
            { name: month(PERIOD), values: farmerDayRevenue.now },
            { name: month(PREVIOUS), values: farmerDayRevenue.prev, compare: true },
          ]}
          format={(v) => num(v / 1e6, 1)}
        />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">{t('best.title')}</h2>
          <p className="text-small text-ink-muted">{t('best.note', { month: month(PERIOD) })}</p>
          <BarList rows={bestSellerRows} format={vnd} />
          <Table
            columns={[
              {
                key: 'n',
                label: t('best.product'),
                render: (r: { productId: number; qty: number }) => <b>{product(r.productId)?.name}</b>,
              },
              { key: 'u', label: t('best.soldPer'), render: (r) => unitName(product(r.productId)?.unit ?? '') },
              {
                key: 'pu',
                label: t('best.price'),
                align: 'num',
                render: (r) => {
                  const p = product(r.productId)!;
                  return perUnit(p.price, p.unit);
                },
              },
              {
                key: 'q',
                label: t('best.sold'),
                align: 'num',
                render: (r) => {
                  const p = product(r.productId)!;
                  return units(r.qty, p.unit, p.plural);
                },
              },
              {
                key: 'v',
                label: t('best.revenue'),
                align: 'num',
                render: (r) => vnd(r.qty * product(r.productId)!.price),
              },
            ]}
            rows={bestSellerQty}
          />
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">{t('where.title')}</h2>
          <BarList rows={revenueByMarket} format={vnd} />
          <p className="text-small text-ink-muted">{t('where.note', { count: 6, cancelled: 2 })}</p>
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h2">{t('past.title')}</h2>
          <span className="text-small text-ink-muted">{t('past.note')}</span>
        </div>
        <Table columns={columns} rows={pastOrders} />
        <Pagination page={1} pages={1} onChange={() => {}} />
      </section>
    </div>
  );
};

export default FarmerHistoryPage;
