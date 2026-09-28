import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AdminReportApi,
  type TopFarmerDto,
  type TopProductDto,
  type RevenueByMarketDto,
} from '@/api-requests/report.requests';
import AskAssistant from '@/components/assistant/AskAssistant';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Kpi } from '@/components/ui/kpi';
import { Table, type TableColumn } from '@/components/ui/table';
import useRequest from '@/hooks/useRequest';
import { perUnit, units, money } from '@/lib/format';
import { clampRange } from './reports.helpers';
import ReportsSkeleton from './ReportsSkeleton';

const pad = (n: number) => String(n).padStart(2, '0');
/** A Date → "yyyy-MM-dd" for the `from`/`to` query params (contract's date-only format, not the reader's Settings). */
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const today = new Date();
const DEFAULT_FROM = ymd(new Date(today.getFullYear(), today.getMonth(), 1));
const DEFAULT_TO = ymd(new Date(today.getFullYear(), today.getMonth() + 1, 0));

const TOP_LIMIT = 10;

/**
 * FR-075 — orders and revenue across the platform, split by market, and the Farmers and products that sell the most.
 * Revenue is the total of completed orders, paid to the stalls rather than through MarketLink. The two totals up top
 * come from the platform dashboard and are not scoped to the date range below (the server does not date-filter them).
 */
const AdminReportsPage = () => {
  const { t } = useTranslation('AdminReports');
  const { t: tAssistant } = useTranslation('common');
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [initialLoading, setInitialLoading] = useState(import.meta.env.MODE !== 'test');

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const { state: dashboardLoad, retry: retryDashboard } = useRequest('admin-reports-dashboard', () =>
    AdminReportApi.dashboard(),
  );

  const { state: marketLoad, retry: retryMarket } = useRequest(`admin-reports-market:${from}:${to}`, () =>
    AdminReportApi.revenueByMarket({ from, to }),
  );

  const { state: farmerLoad, retry: retryFarmer } = useRequest(`admin-reports-farmers:${from}:${to}`, () =>
    AdminReportApi.topFarmers({ from, to, limit: TOP_LIMIT }),
  );

  const { state: productLoad, retry: retryProduct } = useRequest(`admin-reports-products:${from}:${to}`, () =>
    AdminReportApi.topProducts({ from, to, limit: TOP_LIMIT }),
  );

  const showSkeleton =
    dashboardLoad.kind === 'loading' ||
    marketLoad.kind === 'loading' ||
    farmerLoad.kind === 'loading' ||
    productLoad.kind === 'loading' ||
    initialLoading;

  const marketColumns: TableColumn<RevenueByMarketDto>[] = [
    { key: 'market', label: t('col.market'), render: (r) => r.marketName },
    { key: 'orders', label: t('col.orders'), align: 'num', render: (r) => r.orderCount },
    { key: 'revenue', label: t('col.revenue'), align: 'num', render: (r) => money(r.revenue) },
  ];

  const farmerColumns: TableColumn<TopFarmerDto & { rank: number }>[] = [
    { key: 'rank', label: '#', align: 'num', render: (r) => r.rank },
    { key: 'stall', label: t('col.stall'), render: (r) => r.stallName },
    { key: 'orders', label: t('col.completedOrders'), align: 'num', render: (r) => r.orderCount },
    { key: 'revenue', label: t('col.revenue'), align: 'num', render: (r) => money(r.revenue) },
    { key: 'rating', label: t('col.rating'), align: 'num', render: (r) => r.ratingAvg.toFixed(1) },
  ];
  const rankedFarmers = farmerLoad.kind === 'ready' ? farmerLoad.data.map((r, i) => ({ ...r, rank: i + 1 })) : [];

  const productColumns: TableColumn<TopProductDto>[] = [
    {
      key: 'name',
      label: t('col.product'),
      render: (r) => (
        <>
          <b>{r.name}</b>
          <span className="text-ink-muted block text-[13px]">{r.stallName}</span>
        </>
      ),
    },
    { key: 'unit', label: t('col.soldPer'), render: (r) => r.unit },
    { key: 'price', label: t('col.price'), align: 'num', render: (r) => perUnit(r.unitPrice, r.unit) },
    { key: 'qty', label: t('col.sold'), align: 'num', render: (r) => units(r.quantitySold, r.unit) },
    { key: 'revenue', label: t('col.revenue'), align: 'num', render: (r) => money(r.revenue) },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h1 text-ink font-bold">{t('title')}</h1>
          <AskAssistant question={tAssistant('assistant.ask.reports', { from, to })} />
        </div>
        <p className="text-body max-w-160">{t('intro')}</p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reports-from" className="text-small font-bold">
            {t('range.from')}
          </label>
          <input
            id="reports-from"
            type="date"
            value={from}
            max={to}
            onChange={(e) => {
              const next = clampRange(from, to, 'from', e.target.value);
              setFrom(next.from);
              setTo(next.to);
            }}
            className="border-line-strong bg-surface-raised text-body min-h-11 rounded-sm border-[1.5px] px-3"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reports-to" className="text-small font-bold">
            {t('range.to')}
          </label>
          <input
            id="reports-to"
            type="date"
            value={to}
            min={from}
            onChange={(e) => {
              const next = clampRange(from, to, 'to', e.target.value);
              setFrom(next.from);
              setTo(next.to);
            }}
            className="border-line-strong bg-surface-raised text-body min-h-11 rounded-sm border-[1.5px] px-3"
          />
        </div>
      </form>

      {showSkeleton ? (
        <ReportsSkeleton />
      ) : (
        <>
          {dashboardLoad.kind === 'error' ? (
            <LoadError noun={t('kpi.noun')} onRetry={retryDashboard} />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <Kpi label={t('kpi.orders')} value={dashboardLoad.data.totalOrders} note={t('kpi.ordersNote')} />
              <Kpi
                label={t('kpi.revenue')}
                value={money(dashboardLoad.data.revenueTotal)}
                note={t('kpi.revenueNote')}
              />
            </div>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('byMarket.title')}</h2>
            {marketLoad.kind === 'error' ? (
              <LoadError noun={t('byMarket.noun')} onRetry={retryMarket} />
            ) : marketLoad.data?.length ? (
              <Table columns={marketColumns} rows={marketLoad.data} />
            ) : (
              <DataState title={t('byMarket.empty.title')} text={t('byMarket.empty.text')} />
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-h2">{t('topFarmers.title')}</h2>
              <span className="text-small text-ink-muted">{t('topFarmers.note')}</span>
            </div>
            {farmerLoad.kind === 'error' ? (
              <LoadError noun={t('topFarmers.noun')} onRetry={retryFarmer} />
            ) : rankedFarmers.length ? (
              <Table columns={farmerColumns} rows={rankedFarmers} />
            ) : (
              <DataState title={t('topFarmers.empty.title')} text={t('topFarmers.empty.text')} />
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-h2">{t('topProducts.title')}</h2>
              <span className="text-small text-ink-muted">{t('topProducts.note')}</span>
            </div>
            {productLoad.kind === 'error' ? (
              <LoadError noun={t('topProducts.noun')} onRetry={retryProduct} />
            ) : productLoad.data?.length ? (
              <>
                <Table columns={productColumns} rows={productLoad.data} />
                <p className="text-small text-ink-muted">{t('topProducts.unitsNote')}</p>
              </>
            ) : (
              <DataState title={t('topProducts.empty.title')} text={t('topProducts.empty.text')} />
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AdminReportsPage;
