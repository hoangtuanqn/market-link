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
import { units, vnd } from '@/lib/format';
import type { OrderStatus } from '@/types/order.types';
import Notification from '@/utils/notification';

const PAST_STATUSES: OrderStatus[] = ['completed', 'declined', 'cancelled'];

/** FR-069 — what sold in September, how it compares with August, and the completed/declined/cancelled orders behind it. */
const FarmerHistoryPage = () => {
  const pastOrders = farmerOrders.filter((o) => PAST_STATUSES.includes(o.status));

  const bestSellerRows = bestSellerQty.map(({ productId, qty }) => {
    const p = product(productId)!;
    return { label: p.name, value: qty * p.price };
  });

  const columns: TableColumn<FarmerOrderType>[] = [
    { key: 'd', label: 'Pickup', render: (r) => `${r.date} · ${r.slot}` },
    {
      key: 'code',
      label: 'Order',
      render: (r) => <Link to={`/farmer/orders/${r.code.replace('#', '')}`}>{r.code}</Link>,
    },
    { key: 'who', label: 'Customer' },
    {
      key: 'i',
      label: 'Items',
      render: (r) => r.items.map((i) => `${i.qty}× ${product(i.productId)?.name}`).join(', '),
    },
    { key: 't', label: 'Total', align: 'num', render: (r) => vnd(farmerOrderTotal(r)) },
    { key: 's', label: 'Status', render: (r) => <OrderStatusBadge status={r.status} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">Sales history</h1>
          <p className="text-body max-w-160">
            What you sold, and how it compares with the period before. Revenue counts completed orders only, the money
            customers handed you at the stall.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            Notification.success({
              title: 'Export started',
              text: 'Export started. The CSV covers the period and the market on screen.',
            })
          }
        >
          Export the period
        </Button>
      </div>

      <PeriodBar label="September 2026" days="30 days" compare="August 2026" />

      <SelectField
        id="mk"
        label="Market"
        className="max-w-80"
        options={['Both markets', 'Thảo Điền Weekend Market', 'Thủ Đức Farmers Market']}
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi label="Completed orders" value="112" note="of 128 placed with you" delta={{ pct: 18.9 }} />
        <Kpi
          label="Revenue"
          value="8,450,000"
          note="₫, paid at the stall"
          delta={{ pct: 21.4 }}
          highlight
          spark={overviewSpark.revenue}
        />
        <Kpi label="Average order" value="75,400" note="₫ per completed order" delta={{ pct: 2.1 }} />
        <Kpi label="You declined" value="6" note="4.7% of orders placed with you" delta={{ pct: 1.4, good: false }} />
      </div>

      <Card className="flex flex-col gap-3 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3">Revenue by market day</h2>
          <p className="text-small text-ink-muted">
            In millions of ₫. You only sell on Saturday and Sunday, so each column is one market morning.
          </p>
        </div>
        <ColumnChart
          caption="Revenue by market day in September against August, in millions of dong"
          labels={farmerDayRevenue.labels}
          series={[
            { name: 'September', values: farmerDayRevenue.now },
            { name: 'August', values: farmerDayRevenue.prev, compare: true },
          ]}
          format={(v) => (v / 1e6).toFixed(1)}
        />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">Best sellers</h2>
          <p className="text-small text-ink-muted">
            Revenue in September. Quantities are in each product&apos;s own unit, so they are never added together.
          </p>
          <BarList rows={bestSellerRows} format={vnd} />
          <Table
            columns={[
              {
                key: 'n',
                label: 'Product',
                render: (r: { productId: number; qty: number }) => <b>{product(r.productId)?.name}</b>,
              },
              { key: 'u', label: 'Sold per', render: (r) => product(r.productId)?.unit },
              {
                key: 'pu',
                label: 'Price',
                align: 'num',
                render: (r) => {
                  const p = product(r.productId)!;
                  return `${vnd(p.price)} / ${p.unit}`;
                },
              },
              {
                key: 'q',
                label: 'Sold',
                align: 'num',
                render: (r) => {
                  const p = product(r.productId)!;
                  return units(r.qty, p.unit, p.plural);
                },
              },
              {
                key: 'v',
                label: 'Revenue',
                align: 'num',
                render: (r) => vnd(r.qty * product(r.productId)!.price),
              },
            ]}
            rows={bestSellerQty}
          />
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">Where it sold</h2>
          <BarList rows={revenueByMarket} format={vnd} />
          <p className="text-small text-ink-muted">
            6 orders were declined and 2 cancelled this month. Neither counts here.
          </p>
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h2">Past orders</h2>
          <span className="text-small text-ink-muted">Completed, declined and cancelled</span>
        </div>
        <Table columns={columns} rows={pastOrders} />
        <Pagination page={1} pages={1} onChange={() => {}} />
      </section>
    </div>
  );
};

export default FarmerHistoryPage;
