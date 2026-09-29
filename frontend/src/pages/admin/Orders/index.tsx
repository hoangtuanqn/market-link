import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import CatalogApi from '@/api-requests/catalog.requests';
import { AdminReportApi } from '@/api-requests/report.requests';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import { SelectField } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_ORDERS_PATH } from '@/constants/nav';
import type { OrderListItemDto } from '@/api-requests/order.requests';
import useRequest from '@/hooks/useRequest';
import { pickupLabel, money } from '@/lib/format';
import type { OrderStatus } from '@/types/order.types';
import OrderTableSkeleton from './OrderTableSkeleton';

const FILTERS = ['all', 'placed', 'accepted', 'ready', 'completed', 'declined', 'cancelled'] as const;
type Filter = (typeof FILTERS)[number];
const STATUS_FILTERS = FILTERS.filter((f): f is Exclude<Filter, 'all'> => f !== 'all');

const FILTER_STATUS: Record<Filter, OrderStatus | undefined> = {
  all: undefined,
  placed: 'placed',
  accepted: 'accepted',
  ready: 'ready',
  completed: 'completed',
  declined: 'declined',
  cancelled: 'cancelled',
};

const PAGE_SIZE = 20;
const NO_ROWS: OrderListItemDto[] = [];

const AdminOrdersPage = () => {
  const { t } = useTranslation('AdminOrders');
  const [filter, setFilter] = useState<Filter>('all');
  const [market, setMarket] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [initialLoading, setInitialLoading] = useState(import.meta.env.MODE !== 'test');

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const { state: load, retry } = useRequest(`admin-orders:${filter}:${market}:${page}`, () =>
    AdminReportApi.orders({ status: FILTER_STATUS[filter], marketId: market || undefined, page, pageSize: PAGE_SIZE }),
  );

  const { state: countsLoad } = useRequest(`admin-order-counts:${market}`, () =>
    Promise.all(
      STATUS_FILTERS.map((f) =>
        AdminReportApi.orders({ status: FILTER_STATUS[f], marketId: market || undefined, page: 1, pageSize: 1 }),
      ),
    ).then((responses) => {
      const next: Partial<Record<Filter, number>> = {};
      STATUS_FILTERS.forEach((f, i) => {
        next[f] = responses[i]?.total;
      });
      next.all = Object.values(next).reduce<number>((sum, n) => sum + (n ?? 0), 0);
      return next;
    }),
  );
  const counts = countsLoad.kind === 'ready' ? countsLoad.data : {};

  const { state: marketsLoad } = useRequest('admin-orders-markets', () =>
    CatalogApi.listMarkets({ pageSize: 50 }).then((r) => r.items),
  );
  const marketOptions = marketsLoad.kind === 'ready' ? marketsLoad.data : [];

  const rows = load.kind === 'ready' ? load.data.items : NO_ROWS;
  const total = load.kind === 'ready' ? load.data.total : 0;
  const showSkeleton = load.kind === 'loading' || initialLoading;

  const changeFilter = (f: Filter) => {
    if (f === filter) return;
    setFilter(f);
    setPage(1);
  };

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
        <h1 className="text-h1 text-ink font-bold">{t('title')}</h1>
        <p className="text-body max-w-160">{t('intro')}</p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-6">
          <div role="group" aria-label={t('list.filterLabel')} className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Chip key={f} pressed={filter === f} onClick={() => changeFilter(f)}>
                {t(`filter.${f}`)}
                {counts[f] !== undefined && <span className="text-ink-muted ml-1">({counts[f]})</span>}
              </Chip>
            ))}
          </div>
          <SelectField
            id="admin-orders-market"
            label={t('list.market')}
            className="min-w-55"
            value={market}
            onChange={(e) => {
              setMarket(e.target.value ? Number(e.target.value) : '');
              setPage(1);
            }}
            options={[
              { value: '', label: t('list.allMarkets') },
              ...marketOptions.map((m) => ({ value: String(m.id), label: m.name })),
            ]}
          />
        </div>

        {showSkeleton ? (
          <OrderTableSkeleton />
        ) : load.kind === 'error' ? (
          <LoadError noun={t('noun')} onRetry={retry} />
        ) : rows.length ? (
          <div className="flex flex-col gap-4">
            <Table caption={t('list.inPeriod', { count: total })} columns={columns} rows={rows} />
            {total > PAGE_SIZE && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-small text-ink-muted">
                  {t('list.showing', {
                    from: (page - 1) * PAGE_SIZE + 1,
                    to: (page - 1) * PAGE_SIZE + rows.length,
                    total,
                  })}
                </span>
                <Pagination page={page} pages={Math.ceil(total / PAGE_SIZE)} onChange={setPage} />
              </div>
            )}
          </div>
        ) : (
          <DataState fill title={t('empty.title')} text={t('empty.text')} />
        )}
      </section>
    </div>
  );
};

export default AdminOrdersPage;
