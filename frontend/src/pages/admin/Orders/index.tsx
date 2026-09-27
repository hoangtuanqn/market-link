import { useState } from 'react';
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
import { ADMIN_CUSTOMERS_PATH, ADMIN_ORDERS_PATH } from '@/constants/nav';
import type { OrderListItemDto } from '@/api-requests/order.requests';
import useRequest from '@/hooks/useRequest';
import { pickupLabel, vnd } from '@/lib/format';
import type { OrderStatus } from '@/types/order.types';

const FILTERS = ['all', 'placed', 'accepted', 'ready', 'completed', 'declined', 'cancelled'] as const;
type Filter = (typeof FILTERS)[number];
const STATUS_FILTERS = FILTERS.filter((f): f is Exclude<Filter, 'all'> => f !== 'all');

/** One status per chip (a "ruling", see task-9-brief.md 9.4): `all` sends no `status` at all. */
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

/**
 * FR-070 — every order on MarketLink, across every market. An admin reads these: only the stall moves an order through
 * its states (D-04), so there is no action column.
 */
const AdminOrdersPage = () => {
  const { t } = useTranslation('AdminOrders');
  const { t: tc } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const [market, setMarket] = useState<number | ''>('');
  const [page, setPage] = useState(1);

  const { state: load, retry } = useRequest(`admin-orders:${filter}:${market}:${page}`, () =>
    AdminReportApi.orders({ status: FILTER_STATUS[filter], marketId: market || undefined, page, pageSize: PAGE_SIZE }),
  );

  const { state: countsLoad } = useRequest('admin-order-counts', () =>
    Promise.all(
      STATUS_FILTERS.map((f) => AdminReportApi.orders({ status: FILTER_STATUS[f], page: 1, pageSize: 1 })),
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
    {
      key: 'customer',
      label: t('col.customer'),
      render: (o) => (
        <Link to={`${ADMIN_CUSTOMERS_PATH}/${o.customerId}`} className="text-brand underline">
          {o.customerName}
        </Link>
      ),
    },
    { key: 'stall', label: t('col.stall'), render: (o) => o.stallName },
    { key: 'market', label: t('col.market'), render: (o) => o.marketName },
    {
      key: 'when',
      label: t('col.pickup'),
      render: (o) => pickupLabel(o.pickupDate, `${o.pickupStart}–${o.pickupEnd}`),
    },
    { key: 'total', label: t('col.total'), align: 'num', render: (o) => vnd(o.totalAmount) },
    { key: 'status', label: t('col.status'), render: (o) => <OrderStatusBadge status={o.status} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
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

        {load.kind === 'loading' ? (
          <p role="status" className="text-ink-muted">
            {tc('notify.list.loading')}
          </p>
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
