import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import OrderApi, { type OrderListItemDto } from '@/api-requests/order.requests';
import { FarmerReportApi } from '@/api-requests/report.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { BarList } from '@/components/ui/bar-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Kpi } from '@/components/ui/kpi';
import { Pagination } from '@/components/ui/pagination';
import { Table, type TableColumn } from '@/components/ui/table';
import useRequest from '@/hooks/useRequest';
import { pickupLabel, money } from '@/lib/format';
import { fetchAllSales, sumSales } from './history.helpers';

const PAGE_SIZE = 50;
const BEST_SELLER_LIMIT = 8;

const pad = (n: number) => String(n).padStart(2, '0');
/** A Date, local time, as "yyyy-MM-dd" — what `from`/`to` expect. */
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/**
 * FR-069 — what sold this month: completed orders (`FarmerReportApi.sales`), best sellers, and the declined/cancelled
 * counts (two small all-time totals — the order list has no date range filter).
 */
const FarmerHistoryPage = () => {
  const { t, i18n } = useTranslation('FarmerHistory');
  const now = new Date();
  const [month, setMonth] = useState(() => startOfMonth(now));
  const [page, setPage] = useState(1);
  const monthLabel = new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(month);
  const num = (n: number) => new Intl.NumberFormat(i18n.language).format(n);

  const changeMonth = (delta: number) => {
    setMonth((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
    setPage(1);
  };

  const from = ymd(startOfMonth(month));
  const to = ymd(endOfMonth(month));

  // The "past orders" table: its own paged request, independent of the month totals below.
  const { state: salesLoad, retry: retrySales } = useRequest(`farmer-sales:${from}:${to}:${page}`, () =>
    FarmerReportApi.sales({ from, to, page, pageSize: PAGE_SIZE }),
  );
  // The month's revenue/average KPIs: every completed order in range, not just the table's current page — a
  // partial sum here would silently change as the reader pages through the table.
  const { state: totalsLoad, retry: retryTotals } = useRequest(`history-totals:${from}:${to}`, () =>
    fetchAllSales(from, to),
  );
  const { state: bestLoad, retry: retryBest } = useRequest(`farmer-history-best:${from}:${to}`, () =>
    FarmerReportApi.bestSellers({ from, to, limit: BEST_SELLER_LIMIT }),
  );
  // All-time totals: `OrderApi.farmerList` filters by a single pickup date, not a range, so these cannot be
  // scoped to the month on screen yet.
  const { state: declinedLoad } = useRequest('farmer-declined-total', () =>
    OrderApi.farmerList({ status: 'declined', pageSize: 1 }),
  );
  const { state: cancelledLoad } = useRequest('farmer-cancelled-total', () =>
    OrderApi.farmerList({ status: 'cancelled', pageSize: 1 }),
  );

  const sales = salesLoad.kind === 'ready' ? salesLoad.data : null;
  const best = bestLoad.kind === 'ready' ? bestLoad.data : [];
  const totalsData = totalsLoad.kind === 'ready' ? totalsLoad.data : null;
  const totals = totalsData ? sumSales(totalsData.rows) : null;
  const completed = totalsData?.total ?? 0;
  const revenue = totals?.revenue ?? 0;
  const average = totals?.average ?? 0;
  const partial = totalsData?.partial ?? false;
  const declined = declinedLoad.kind === 'ready' ? declinedLoad.data.total : null;
  const cancelled = cancelledLoad.kind === 'ready' ? cancelledLoad.data.total : null;
  const kpiLoading =
    totalsLoad.kind === 'loading' || declinedLoad.kind === 'loading' || cancelledLoad.kind === 'loading';
  const kpiError = totalsLoad.kind === 'error' || declinedLoad.kind === 'error' || cancelledLoad.kind === 'error';

  const columns: TableColumn<OrderListItemDto>[] = [
    { key: 'd', label: t('col.pickup'), render: (r) => pickupLabel(r.pickupDate, `${r.pickupStart}–${r.pickupEnd}`) },
    {
      key: 'code',
      label: t('col.order'),
      render: (r) => (
        <Link to={`/farmer/orders/${r.orderId}`} className="text-brand font-bold underline">
          {r.orderCode}
        </Link>
      ),
    },
    { key: 'who', label: t('col.customer'), render: (r) => r.customerName },
    { key: 'i', label: t('col.items'), align: 'num', render: (r) => r.itemCount },
    { key: 't', label: t('col.total'), align: 'num', render: (r) => money(r.totalAmount) },
    { key: 's', label: t('col.status'), render: (r) => <OrderStatusBadge status={r.status} /> },
  ];

  const pages = sales ? Math.max(1, Math.ceil(sales.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" aria-label={t('month.previous')} onClick={() => changeMonth(-1)}>
            <ChevronLeftIcon size={16} />
          </Button>
          <span className="min-w-40 text-center text-[15px] font-bold">{monthLabel}</span>
          <Button
            variant="secondary"
            size="sm"
            aria-label={t('month.next')}
            disabled={sameMonth(month, now)}
            onClick={() => changeMonth(1)}
          >
            <ChevronRightIcon size={16} />
          </Button>
        </div>
      </div>

      {kpiLoading ? (
        <MarketCardSkeleton count={4} />
      ) : kpiError ? (
        <LoadError noun={t('kpi.noun')} onRetry={retryTotals} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <Kpi label={t('kpi.completed')} value={num(completed)} />
          <Kpi
            label={t('kpi.revenue')}
            value={money(revenue)}
            note={partial ? t('kpi.partial') : t('kpi.revenueNote')}
            highlight
          />
          <Kpi label={t('kpi.average')} value={money(average)} note={partial ? t('kpi.partial') : undefined} />
          <Kpi label={t('kpi.declined')} value={declined == null ? '—' : num(declined)} note={t('kpi.allTime')} />
          <Kpi label={t('kpi.cancelled')} value={cancelled == null ? '—' : num(cancelled)} note={t('kpi.allTime')} />
        </div>
      )}

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-h3">{t('best.title')}</h2>
        <p className="text-small text-ink-muted -mt-1">{t('best.note', { month: monthLabel })}</p>
        {bestLoad.kind === 'loading' ? (
          <MarketCardSkeleton count={2} />
        ) : bestLoad.kind === 'error' ? (
          <LoadError noun={t('best.noun')} onRetry={retryBest} />
        ) : best.length ? (
          <BarList rows={best.map((b) => ({ label: b.name, value: b.revenue }))} format={money} />
        ) : (
          <DataState title={t('best.empty.title')} text={t('best.empty.text')} />
        )}
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h2">{t('past.title')}</h2>
          <span className="text-small text-ink-muted">{t('past.note')}</span>
        </div>
        {salesLoad.kind === 'loading' ? (
          <MarketCardSkeleton count={3} />
        ) : salesLoad.kind === 'error' ? (
          <LoadError noun={t('past.noun')} onRetry={retrySales} />
        ) : sales && sales.items.length ? (
          <>
            <Table columns={columns} rows={sales.items} />
            <Pagination page={page} pages={pages} onChange={setPage} />
          </>
        ) : (
          <DataState title={t('past.empty.title')} text={t('past.empty.text')} />
        )}
      </section>
    </div>
  );
};

export default FarmerHistoryPage;
