import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import AdminFarmerApi from '@/api-requests/admin-farmer.requests';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { BarList } from '@/components/ui/bar-list';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ColumnChart } from '@/components/ui/column-chart';
import { Kpi } from '@/components/ui/kpi';
import { Table, type TableColumn } from '@/components/ui/table';
import {
  ADMIN_ANNOUNCEMENTS_PATH,
  ADMIN_CUSTOMERS_PATH,
  ADMIN_FARMERS_PATH,
  ADMIN_FEEDBACK_PATH,
  ADMIN_MARKETS_PATH,
  ADMIN_MODERATION_PATH,
  ADMIN_ORDERS_PATH,
  ADMIN_REPORTS_PATH,
} from '@/constants/nav';
import { ordersThisWeekByMarket, platformTotals, series } from '@/data/admin';
import { farmerName, marketName, orderTotal, orders } from '@/data/customer';
import { vnd } from '@/lib/format';
import type { OrderType } from '@/types/order.types';

/** The period on screen and the one it is compared with (the seeded figures are September against August 2026). */
const PERIOD = new Date(2026, 8, 1);
const PREVIOUS = new Date(2026, 7, 1);

/** Docs/prototype/admin/overview.html — the six most recent orders across the whole platform. */
const LATEST = 6;

/**
 * FR-070 — the dashboard an admin lands on. Totals for farmers, customers, markets and orders, revenue by day, what
 * still needs attention, and the newest orders across every market.
 *
 * Only the waiting-farmer count is real (FR-071 has a backend); everything else is the frozen demo data in
 * `@/data/admin` until markets, orders and products have tables of their own.
 */
const AdminHomePage = () => {
  const { t, i18n } = useTranslation('AdminHome');
  const monthYear = (d: Date) => new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(d);
  const month = (d: Date) => new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(d);
  const num = (n: number, digits = 0) =>
    new Intl.NumberFormat(i18n.language, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

  const [waiting, setWaiting] = useState(platformTotals.farmersWaiting);

  // The sidebar badge counts the same queue, so the dashboard reads it from the API too rather than showing a
  // demo number next to a real one.
  useEffect(() => {
    AdminFarmerApi.list({ status: 'pending', page: 1, pageSize: 1 })
      .then((response) => setWaiting(response.data.total))
      .catch(() => {});
  }, []);

  const attention = [
    { to: ADMIN_FARMERS_PATH, count: waiting, text: t('attention.farmers', { count: waiting }) },
    { to: ADMIN_MODERATION_PATH, count: 1, text: t('attention.reported', { count: 1 }) },
    { to: ADMIN_FEEDBACK_PATH, count: 2, text: t('attention.feedback', { count: 2 }) },
    { to: ADMIN_ANNOUNCEMENTS_PATH, count: 1, text: t('attention.announcements', { count: 1 }) },
  ];

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
    { key: 'stall', label: t('col.stall'), render: (o) => farmerName(o.farmerId) },
    { key: 'market', label: t('col.market'), render: (o) => marketName(o.marketId) },
    { key: 'when', label: t('col.pickup'), render: (o) => `${o.date} · ${o.slot}` },
    { key: 'total', label: t('col.total'), align: 'num', render: (o) => vnd(orderTotal(o)) },
    { key: 'status', label: t('col.status'), render: (o) => <OrderStatusBadge status={o.status} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-overline text-ink-muted uppercase">{t('overline', { year: PERIOD.getFullYear() })}</p>
        <h1 className="font-hand text-h1">{t('title')}</h1>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi
          label={t('kpi.farmers')}
          value={num(platformTotals.farmers)}
          note={t('kpi.farmersNote', { waiting, suspended: platformTotals.farmersSuspended })}
          delta={{ pct: 14.3, vs: t('vs', { month: month(PREVIOUS) }) }}
          spark={series.sparkFarmers}
          highlight
          href={ADMIN_FARMERS_PATH}
          linkLabel={t('kpi.farmersLink')}
        />
        <Kpi
          label={t('kpi.customers')}
          value={num(platformTotals.customers)}
          note={t('kpi.customersNote', { count: platformTotals.customersThisMonth })}
          delta={{ pct: 9.9, vs: t('vs', { month: month(PREVIOUS) }) }}
          spark={series.sparkCustomers}
          href={ADMIN_CUSTOMERS_PATH}
          linkLabel={t('kpi.customersLink')}
        />
        <Kpi
          label={t('kpi.markets')}
          value={num(platformTotals.markets)}
          note={t('kpi.marketsNote')}
          delta={{ pct: 0, vs: t('vs', { month: month(PREVIOUS) }) }}
          spark={series.sparkMarkets}
          href={ADMIN_MARKETS_PATH}
          linkLabel={t('kpi.marketsLink')}
        />
        <Kpi
          label={t('kpi.orders')}
          value={num(platformTotals.orders)}
          note={t('kpi.ordersNote', {
            week: num(platformTotals.ordersThisWeek),
            total: vnd(platformTotals.completedValue),
          })}
          delta={{ pct: 12.7, vs: t('vs', { month: month(PREVIOUS) }) }}
          spark={series.sparkOrders}
          href={ADMIN_ORDERS_PATH}
          linkLabel={t('kpi.ordersLink')}
        />
      </div>
      <p className="text-small text-ink-muted">{t('tilesNote', { now: monthYear(PERIOD), prev: month(PREVIOUS) })}</p>

      <Card className="flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-h3">{t('revenue.title')}</h2>
            <p className="text-small text-ink-muted">
              {t('revenue.note', { now: month(PERIOD), prev: month(PREVIOUS) })}
            </p>
          </div>
          <ButtonLink to={ADMIN_REPORTS_PATH} variant="secondary" size="sm">
            {t('revenue.reports')}
          </ButtonLink>
        </div>
        <ColumnChart
          type="line"
          height={250}
          caption={t('revenue.caption', { now: month(PERIOD), prev: month(PREVIOUS) })}
          axisLabel={t('revenue.axis')}
          labels={series.dayLabels}
          series={[
            { name: month(PERIOD), values: series.revenueNow },
            { name: month(PREVIOUS), values: series.revenuePrev, compare: true },
          ]}
          format={(v) => num(v / 1e6, 1)}
        />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">{t('attention.title')}</h2>
          <ul className="m-0 flex flex-col gap-2 p-0">
            {attention.map((row) => (
              <li key={row.to}>
                <Link to={row.to} className="hover:bg-surface-sunken flex items-baseline gap-3 rounded-sm py-1">
                  <b className="font-hand text-h3 text-brand">{num(row.count)}</b>
                  <span className="text-[15px]">{row.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-h3">{t('byMarket.title')}</h2>
            <Link to={ADMIN_ORDERS_PATH} className="text-brand text-small underline">
              {t('byMarket.link')}
            </Link>
          </div>
          <BarList
            rows={ordersThisWeekByMarket.map((r) => ({
              label: marketName(r.marketId),
              value: r.value,
              suffix: t('byMarket.suffix'),
            }))}
          />
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h2">{t('latest.title')}</h2>
          <span className="text-small text-ink-muted">{t('latest.readOnly')}</span>
        </div>
        <Table columns={columns} rows={orders.slice(0, LATEST)} />
      </section>
    </div>
  );
};

export default AdminHomePage;
