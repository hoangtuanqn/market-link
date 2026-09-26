import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { BarList } from '@/components/ui/bar-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ColumnChart } from '@/components/ui/column-chart';
import { SelectField } from '@/components/ui/input';
import { Kpi } from '@/components/ui/kpi';
import { Pagination } from '@/components/ui/pagination';
import { PeriodBar } from '@/components/ui/period-bar';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_CUSTOMERS_PATH, ADMIN_ORDERS_PATH } from '@/constants/nav';
import { orderTotals, ordersByMarket, ordersByStatus, period, series } from '@/data/admin';
import { farmerName, marketName, orderTotal, orders } from '@/data/customer';
import { markets } from '@/data/home';
import { vnd } from '@/lib/format';
import type { OrderType } from '@/types/order.types';
import Notification from '@/utils/notification';

/** The period on screen and the one it is compared with (the seeded figures are September against August 2026). */
const PERIOD = new Date(2026, 8, 1);
const PREVIOUS = new Date(2026, 7, 1);

const FILTERS = ['all', 'completed', 'open', 'declined', 'cancelled'] as const;
type Filter = (typeof FILTERS)[number];

/** Which order states each chip stands for; `all` keeps every row. */
const FILTER_STATES: Record<Filter, OrderType['status'][] | null> = {
  all: null,
  completed: ['completed'],
  open: ['placed', 'accepted', 'ready'],
  declined: ['declined'],
  cancelled: ['cancelled'],
};

/**
 * FR-070 — every order on MarketLink, across the four markets. An admin reads these: only the stall moves an order
 * through its states (D-04), so there is no action column.
 *
 * Figures are the frozen demo data in `@/data/admin` until orders have a table of their own.
 */
const AdminOrdersPage = () => {
  const { t, i18n } = useTranslation('AdminOrders');
  const monthYear = (d: Date) => new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(d);
  const month = (d: Date) => new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(d);
  const num = (n: number, digits = 0) =>
    new Intl.NumberFormat(i18n.language, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

  const [filter, setFilter] = useState<Filter>('all');
  const [market, setMarket] = useState('');
  const [page, setPage] = useState(1);

  const chipCount: Record<Filter, number> = {
    all: orderTotals.placed,
    completed: orderTotals.completed,
    open: orderTotals.open,
    declined: orderTotals.declined,
    cancelled: orderTotals.cancelled,
  };

  const states = FILTER_STATES[filter];
  const rows = orders.filter(
    (o) => (!states || states.includes(o.status)) && (!market || marketName(o.marketId) === market),
  );

  /** The demo list holds eight of the 796 orders in the period, so the pager is decorative. */
  const pages = Math.ceil(orderTotals.placed / 8);

  const columns: TableColumn<OrderType>[] = [
    {
      key: 'code',
      label: t('col.order'),
      render: (o) => (
        <Link to={`${ADMIN_ORDERS_PATH}/${o.code.replace('#', '')}`} className="text-brand underline">
          {o.code}
        </Link>
      ),
    },
    {
      key: 'who',
      label: t('col.customer'),
      render: (o) => (
        <Link to={`${ADMIN_CUSTOMERS_PATH}/${(orders.indexOf(o) % 6) + 1}`} className="text-brand underline">
          {t('customerNo', { n: 1001 + orders.indexOf(o) })}
        </Link>
      ),
    },
    { key: 'stall', label: t('col.stall'), render: (o) => farmerName(o.farmerId) },
    { key: 'market', label: t('col.market'), render: (o) => marketName(o.marketId) },
    { key: 'when', label: t('col.pickup'), render: (o) => `${o.date} · ${o.slot}` },
    { key: 'total', label: t('col.total'), align: 'num', render: (o) => vnd(orderTotal(o)) },
    { key: 'status', label: t('col.status'), render: (o) => <OrderStatusBadge status={o.status} /> },
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

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi
          label={t('kpi.placed')}
          value={num(orderTotals.placed)}
          note={t('kpi.placedNote', { count: 4 })}
          delta={{ pct: 12.7 }}
          spark={series.sparkOrders}
        />
        <Kpi
          label={t('kpi.completed')}
          value={num(orderTotals.completed)}
          note={t('kpi.share', { pct: num((orderTotals.completed / orderTotals.placed) * 100, 1) })}
          delta={{ pct: 9.4 }}
        />
        <Kpi
          label={t('kpi.declined')}
          value={num(orderTotals.declined)}
          note={t('kpi.share', { pct: num((orderTotals.declined / orderTotals.placed) * 100, 1) })}
          delta={{ pct: 1.1, good: false }}
          highlight
        />
        <Kpi
          label={t('kpi.cancelled')}
          value={num(orderTotals.cancelled)}
          note={t('kpi.cancelledNote')}
          delta={{ pct: -2.3, good: true }}
        />
      </div>

      <Card className="flex flex-col gap-3 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3">{t('perDay.title')}</h2>
          <p className="text-small text-ink-muted">{t('perDay.note', { now: month(PERIOD), prev: month(PREVIOUS) })}</p>
        </div>
        <ColumnChart
          caption={t('perDay.caption', { now: month(PERIOD), prev: month(PREVIOUS) })}
          axisLabel={t('perDay.axis')}
          labels={series.dayLabels}
          series={[
            { name: month(PERIOD), values: series.ordersNow },
            { name: month(PREVIOUS), values: series.ordersPrev, compare: true },
          ]}
        />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">{t('byStatus.title')}</h2>
          <BarList
            rows={ordersByStatus.map((r) => ({
              id: r.status,
              label: <OrderStatusBadge status={r.status} />,
              value: r.value,
            }))}
          />
          <p className="text-small text-ink-muted">{t('byStatus.note')}</p>
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">{t('byMarket.title')}</h2>
          <BarList rows={ordersByMarket.map((r) => ({ label: marketName(r.marketId), value: r.value }))} />
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h2">{t('list.title')}</h2>
          <span className="text-small text-ink-muted">
            {t('list.inPeriod', { count: orderTotals.placed, month: month(PERIOD) })}
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-6">
          <div role="group" aria-label={t('list.filterLabel')} className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Chip
                key={f}
                pressed={filter === f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
              >
                {t(`filter.${f}`)}
                <span className="text-ink-muted ml-1">({num(chipCount[f])})</span>
              </Chip>
            ))}
          </div>
          <SelectField
            id="admin-orders-market"
            label={t('list.market')}
            className="min-w-55"
            value={market}
            onChange={(e) => {
              setMarket(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: t('list.allMarkets') },
              ...markets.map((m) => ({ value: m.name, label: m.name })),
            ]}
          />
        </div>

        <Table columns={columns} rows={rows} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-small text-ink-muted">
            {t('list.showing', { from: rows.length ? 1 : 0, to: rows.length, total: orderTotals.placed })}
          </span>
          <Pagination page={page} pages={pages} onChange={setPage} />
        </div>
      </section>
    </div>
  );
};

export default AdminOrdersPage;
