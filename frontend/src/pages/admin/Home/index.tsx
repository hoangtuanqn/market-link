import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AdminReportApi } from '@/api-requests/report.requests';
import FeedbackApi from '@/api-requests/feedback.requests';
import ModerationApi from '@/api-requests/moderation.requests';
import type { OrderListItemDto } from '@/api-requests/order.requests';
import { InfoIcon } from '@/components/icons';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { BarList } from '@/components/ui/bar-list';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Kpi } from '@/components/ui/kpi';
import { Table, type TableColumn } from '@/components/ui/table';
import {
  ADMIN_CUSTOMERS_PATH,
  ADMIN_FARMERS_PATH,
  ADMIN_FEEDBACK_PATH,
  ADMIN_MARKETS_PATH,
  ADMIN_MODERATION_PATH,
  ADMIN_ORDERS_PATH,
  ADMIN_SETTINGS_PATH,
} from '@/constants/nav';
import usePlatformStatus from '@/hooks/usePlatformStatus';
import useRequest from '@/hooks/useRequest';
import { pickupLabel, money } from '@/lib/format';
import HomeSkeleton from './HomeSkeleton';

const LATEST = 6;
const NO_ORDERS: OrderListItemDto[] = [];

const AdminHomePage = () => {
  const { t } = useTranslation('AdminHome');
  const maintenanceMode = usePlatformStatus();
  const [initialLoading, setInitialLoading] = useState(import.meta.env.MODE !== 'test');

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const { state: homeLoad, retry: retryHome } = useRequest('admin-home', () =>
    Promise.all([
      AdminReportApi.dashboard(),
      FeedbackApi.list({ status: 'new', pageSize: 1 }),
      ModerationApi.reports({ status: 'new', page: 1, pageSize: 1 }),
    ]).then(([dashboard, feedback, reports]) => ({
      dashboard,
      feedbackCount: feedback.total,
      reportedCount: reports.data.total,
    })),
  );

  const { state: revenueLoad, retry: retryRevenue } = useRequest('admin-home-revenue', () =>
    AdminReportApi.revenueByMarket(),
  );

  const { state: ordersLoad, retry: retryOrders } = useRequest('admin-home-orders', () =>
    AdminReportApi.orders({ pageSize: LATEST }).then((r) => r.items),
  );
  const latestOrders = ordersLoad.kind === 'ready' ? ordersLoad.data : NO_ORDERS;
  const showSkeleton =
    homeLoad.kind === 'loading' || revenueLoad.kind === 'loading' || ordersLoad.kind === 'loading' || initialLoading;

  const columns: TableColumn<OrderListItemDto>[] = [
    {
      key: 'code',
      label: t('col.order'),
      render: (o) => (
        <Link to={`${ADMIN_ORDERS_PATH}/${o.orderId}`} className="text-brand underline">
          {o.orderCode}
        </Link>
      ),
    },
    { key: 'customer', label: t('col.customer'), render: (o) => o.customerName },
    { key: 'stall', label: t('col.stall'), render: (o) => o.stallName },
    { key: 'market', label: t('col.market'), render: (o) => o.marketName },
    {
      key: 'when',
      label: t('col.pickup'),
      render: (o) => pickupLabel(o.pickupDate, `${o.pickupStart}–${o.pickupEnd}`),
    },
    { key: 'total', label: t('col.total'), align: 'num', render: (o) => money(o.totalAmount) },
    { key: 'status', label: t('col.status'), render: (o) => <OrderStatusBadge status={o.status} /> },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-overline text-ink-muted uppercase">{t('overline')}</p>
        <h1 className="text-h1 text-ink font-bold">{t('title')}</h1>
      </div>

      {maintenanceMode && (
        <Card
          as="aside"
          aria-label={t('maintenance.title')}
          className="border-warning-ink/30 bg-warning-bg/40 text-ink shadow-tag flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-3.5">
            <div className="bg-warning-bg text-warning-ink border-warning-ink/20 grid size-10 flex-none place-items-center rounded-lg border shadow-xs">
              <InfoIcon size={20} />
            </div>
            <div className="flex max-w-3xl flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body text-ink font-bold">{t('maintenance.title')}</span>
                <span className="bg-warning-bg text-warning-ink inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-bold">
                  {t('maintenance.badge')}
                </span>
              </div>
              <p className="text-small text-ink/90">{t('maintenance.text')}</p>
              <p className="text-small text-ink-muted mt-0.5 font-medium">{t('maintenance.reminder')}</p>
            </div>
          </div>
          <div className="shrink-0 sm:self-center">
            <ButtonLink to={ADMIN_SETTINGS_PATH} variant="secondary" size="sm">
              {t('maintenance.action')}
            </ButtonLink>
          </div>
        </Card>
      )}

      {showSkeleton ? (
        <HomeSkeleton />
      ) : (
        <>
          {homeLoad.kind === 'error' ? (
            <LoadError noun={t('noun')} onRetry={retryHome} />
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                <Kpi
                  label={t('kpi.farmers')}
                  value={homeLoad.data.dashboard.totalFarmers}
                  note={t('kpi.farmersNote', { waiting: homeLoad.data.dashboard.pendingFarmers })}
                  href={ADMIN_FARMERS_PATH}
                  linkLabel={t('kpi.farmersLink')}
                />
                <Kpi
                  label={t('kpi.customers')}
                  value={homeLoad.data.dashboard.totalCustomers}
                  href={ADMIN_CUSTOMERS_PATH}
                  linkLabel={t('kpi.customersLink')}
                />
                <Kpi
                  label={t('kpi.markets')}
                  value={homeLoad.data.dashboard.totalMarkets}
                  href={ADMIN_MARKETS_PATH}
                  linkLabel={t('kpi.marketsLink')}
                />
                <Kpi
                  label={t('kpi.orders')}
                  value={homeLoad.data.dashboard.totalOrders}
                  note={t('kpi.ordersNote', { revenue: money(homeLoad.data.dashboard.revenueTotal) })}
                  href={ADMIN_ORDERS_PATH}
                  linkLabel={t('kpi.ordersLink')}
                />
              </div>

              <Card className="flex flex-col gap-3 p-6">
                <h2 className="text-h3">{t('attention.title')}</h2>
                <ul className="m-0 flex flex-col gap-2 p-0">
                  <li>
                    <Link
                      to={ADMIN_FARMERS_PATH}
                      className="hover:bg-surface-sunken flex items-baseline gap-3 rounded-sm py-1"
                    >
                      <b className="font-hand text-h3 text-brand">{homeLoad.data.dashboard.pendingFarmers}</b>
                      <span className="text-[15px]">
                        {t('attention.farmers', { count: homeLoad.data.dashboard.pendingFarmers })}
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={ADMIN_MODERATION_PATH}
                      className="hover:bg-surface-sunken flex items-baseline gap-3 rounded-sm py-1"
                    >
                      <b className="font-hand text-h3 text-brand">{homeLoad.data.reportedCount}</b>
                      <span className="text-[15px]">
                        {t('attention.reported', { count: homeLoad.data.reportedCount })}
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={ADMIN_FEEDBACK_PATH}
                      className="hover:bg-surface-sunken flex items-baseline gap-3 rounded-sm py-1"
                    >
                      <b className="font-hand text-h3 text-brand">{homeLoad.data.feedbackCount}</b>
                      <span className="text-[15px]">
                        {t('attention.feedback', { count: homeLoad.data.feedbackCount })}
                      </span>
                    </Link>
                  </li>
                </ul>
              </Card>
            </>
          )}

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('byMarket.title')}</h2>
            {revenueLoad.kind === 'error' ? (
              <LoadError noun={t('byMarket.noun')} onRetry={retryRevenue} />
            ) : revenueLoad.data?.length ? (
              <BarList rows={revenueLoad.data.map((r) => ({ label: r.marketName, value: r.revenue }))} format={money} />
            ) : (
              <DataState title={t('byMarket.empty.title')} text={t('byMarket.empty.text')} />
            )}
          </Card>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-h2">{t('latest.title')}</h2>
              <span className="text-small text-ink-muted">{t('latest.readOnly')}</span>
            </div>
            {ordersLoad.kind === 'error' ? (
              <LoadError noun={t('latest.noun')} onRetry={retryOrders} />
            ) : latestOrders.length ? (
              <Table columns={columns} rows={latestOrders} />
            ) : (
              <DataState title={t('latest.empty.title')} text={t('latest.empty.text')} />
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AdminHomePage;
