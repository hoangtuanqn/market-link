import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { BarList } from '@/components/ui/bar-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ColumnChart } from '@/components/ui/column-chart';
import { SelectField } from '@/components/ui/input';
import { Kpi } from '@/components/ui/kpi';
import { PeriodBar } from '@/components/ui/period-bar';
import { Table, type TableColumn } from '@/components/ui/table';
import {
  marketsSideBySide,
  orderTotals,
  ordersByStatus,
  period,
  revenueByMarket,
  series,
  topFarmers,
  topProducts,
  type MarketReportRow,
  type TopFarmerRow,
  type TopProductRow,
} from '@/data/admin';
import { marketName } from '@/data/customer';
import { product } from '@/data/catalog';
import { markets } from '@/data/home';
import { perUnit, units, vnd } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

/** The period on screen and the one it is compared with (the seeded figures are September against August 2026). */
const PERIOD = new Date(2026, 8, 1);
const PREVIOUS = new Date(2026, 7, 1);

/** Signed percentage, coloured up or down. The sign carries the meaning, not the colour alone. */
const Change = ({ value }: { value: number }) => (
  <span className={Helper.cn('font-bold', value >= 0 ? 'text-accent-ink' : 'text-danger')}>
    {value >= 0 ? '+' : ''}
    {value}%
  </span>
);

/**
 * FR-075 — orders and revenue across the platform, split by market, and the Farmers who sell the most. Revenue is the
 * total of completed orders, paid to the stalls rather than through MarketLink.
 */
const AdminReportsPage = () => {
  const { t, i18n } = useTranslation('AdminReports');
  const monthYear = (d: Date) => new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(d);
  const month = (d: Date) => new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(d);
  const num = (n: number, digits = 0) =>
    new Intl.NumberFormat(i18n.language, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

  const [market, setMarket] = useState('');

  const farmerColumns: TableColumn<TopFarmerRow>[] = [
    { key: 'rank', label: '#', align: 'num' },
    { key: 'stall', label: t('col.stall') },
    { key: 'markets', label: t('col.markets') },
    { key: 'orders', label: t('col.completedOrders'), align: 'num' },
    { key: 'revenue', label: t('col.revenue'), align: 'num', render: (r) => vnd(r.revenue) },
    { key: 'products', label: t('col.productsListed'), align: 'num' },
    { key: 'rating', label: t('col.rating'), align: 'num' },
  ];

  const productColumns: TableColumn<TopProductRow>[] = [
    { key: 'rank', label: '#', align: 'num' },
    {
      key: 'name',
      label: t('col.product'),
      render: (r) => {
        const p = product(r.productId);
        return (
          <>
            <b>{p?.name}</b>
            <span className="text-ink-muted block text-[13px]">{p?.stall}</span>
          </>
        );
      },
    },
    { key: 'unit', label: t('col.soldPer'), render: (r) => product(r.productId)?.unit },
    {
      key: 'price',
      label: t('col.price'),
      align: 'num',
      render: (r) => {
        const p = product(r.productId);
        return p ? perUnit(p.price, p.unit) : '';
      },
    },
    {
      key: 'qty',
      label: t('col.sold'),
      align: 'num',
      render: (r) => {
        const p = product(r.productId);
        return units(r.qty, p?.unit, p?.plural);
      },
    },
    { key: 'value', label: t('col.revenue'), align: 'num', render: (r) => vnd(r.value) },
  ];

  const marketColumns: TableColumn<MarketReportRow>[] = [
    { key: 'market', label: t('col.market'), render: (r) => marketName(r.marketId) },
    { key: 'stalls', label: t('col.stalls'), align: 'num' },
    { key: 'orders', label: t('col.orders'), align: 'num' },
    { key: 'ordersChange', label: t('col.change'), align: 'num', render: (r) => <Change value={r.ordersChange} /> },
    { key: 'completed', label: t('col.completed'), align: 'num' },
    { key: 'declined', label: t('col.declined'), align: 'num' },
    { key: 'revenue', label: t('col.revenue'), align: 'num', render: (r) => vnd(r.revenue) },
    { key: 'revenueChange', label: t('col.change'), align: 'num', render: (r) => <Change value={r.revenueChange} /> },
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
          onClick={() => Notification.success({ title: t('export.title'), text: t('export.text') })}
        >
          {t('export.button')}
        </Button>
      </div>

      <PeriodBar
        from={period.from}
        to={period.to}
        label={monthYear(PERIOD)}
        days={t('days', { count: 30 })}
        compare={monthYear(PREVIOUS)}
      />

      <SelectField
        id="reports-market"
        label={t('market')}
        className="max-w-80"
        value={market}
        onChange={(e) => setMarket(e.target.value)}
        options={[{ value: '', label: t('allMarkets') }, ...markets.map((m) => ({ value: m.name, label: m.name }))]}
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi
          label={t('kpi.orders')}
          value={num(orderTotals.placed)}
          note={t('kpi.ordersNote', { month: month(PERIOD) })}
          delta={{ pct: 12.7 }}
          spark={series.sparkOrders}
        />
        <Kpi
          label={t('kpi.revenue')}
          value={num(orderTotals.revenue)}
          note={t('kpi.revenueNote')}
          delta={{ pct: 15.2 }}
          highlight
        />
        <Kpi
          label={t('kpi.average')}
          value={num(orderTotals.averageOrder)}
          note={t('kpi.averageNote')}
          delta={{ pct: 4.2 }}
        />
        <Kpi
          label={t('kpi.declineRate')}
          value={`${num((orderTotals.declined / orderTotals.placed) * 100, 1)}%`}
          note={t('kpi.declineNote', { declined: orderTotals.declined, total: orderTotals.placed })}
          delta={{ pct: 0.3, unit: t('points'), good: false }}
        />
      </div>

      <Card className="flex flex-col gap-3 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3">{t('revenueChart.title')}</h2>
          <p className="text-small text-ink-muted">
            {t('revenueChart.note', { now: month(PERIOD), prev: month(PREVIOUS) })}
          </p>
        </div>
        <ColumnChart
          type="line"
          height={260}
          caption={t('revenueChart.caption', { now: month(PERIOD), prev: month(PREVIOUS) })}
          axisLabel={t('axis.dayOfMonth')}
          labels={series.dayLabels}
          series={[
            { name: month(PERIOD), values: series.revenueNow },
            { name: month(PREVIOUS), values: series.revenuePrev, compare: true },
          ]}
          format={(v) => num(v / 1e6, 1)}
        />
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3">{t('ordersChart.title')}</h2>
          <p className="text-small text-ink-muted">{t('ordersChart.note')}</p>
        </div>
        <ColumnChart
          height={230}
          caption={t('ordersChart.caption', { now: month(PERIOD), prev: month(PREVIOUS) })}
          axisLabel={t('axis.dayOfMonth')}
          labels={series.dayLabels}
          series={[
            { name: month(PERIOD), values: series.ordersNow },
            { name: month(PREVIOUS), values: series.ordersPrev, compare: true },
          ]}
        />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">{t('byMarket.title')}</h2>
          <BarList
            rows={revenueByMarket.map((r) => ({ label: marketName(r.marketId), value: r.value }))}
            format={vnd}
          />
          <p className="text-small text-ink-muted">{t('byMarket.note')}</p>
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">{t('byStatus.title')}</h2>
          <BarList
            rows={ordersByStatus.map((r) => ({
              id: r.status,
              label: <OrderStatusBadge status={r.status} />,
              value: r.value,
            }))}
          />
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h2">{t('topFarmers.title')}</h2>
          <span className="text-small text-ink-muted">{t('topFarmers.note')}</span>
        </div>
        <Table columns={farmerColumns} rows={topFarmers} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h2">{t('topProducts.title')}</h2>
          <span className="text-small text-ink-muted">{t('topProducts.note')}</span>
        </div>
        <Table columns={productColumns} rows={topProducts} />
        <p className="text-small text-ink-muted">{t('topProducts.unitsNote')}</p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h2">{t('sideBySide.title')}</h2>
          <span className="text-small text-ink-muted">{t('sideBySide.note')}</span>
        </div>
        <Table columns={marketColumns} rows={marketsSideBySide} />
      </section>
    </div>
  );
};

export default AdminReportsPage;
