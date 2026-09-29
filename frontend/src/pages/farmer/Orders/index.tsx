import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import OrderApi, { type OrderDetailDto, type OrderListItemDto } from '@/api-requests/order.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import DayChips from '@/components/DayChips';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { Button, ButtonLink } from '@/components/ui/button';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { Table, type TableColumn } from '@/components/ui/table';
import Tabs from '@/components/ui/tabs';
import useRequest from '@/hooks/useRequest';
import { cutoffLabel, dayName, formatDayMonth, pickupLabel, money } from '@/lib/format';
import type { OrderStatus } from '@/types/order.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const STATUSES: OrderStatus[] = ['placed', 'accepted', 'ready', 'completed', 'declined', 'cancelled'];
const PAGE_SIZE = 50;

const DECLINE_REASONS = ['stock', 'day', 'time', 'other'] as const;
type DeclineReason = (typeof DECLINE_REASONS)[number];

type ConfirmDialog = { kind: 'decline' | 'complete'; orderId: number; orderCode: string } | null;

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const dayOptions = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

const FarmerOrdersPage = () => {
  const { t } = useTranslation('FarmerOrders');
  const { t: tc } = useTranslation();
  const [days] = useState(dayOptions);
  const [tab, setTab] = useState<OrderStatus>('placed');
  const [day, setDay] = useState('all');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState<ConfirmDialog>(null);
  const [reason, setReason] = useState<DeclineReason>(DECLINE_REASONS[0]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const changeTab = (next: OrderStatus) => {
    setTab(next);
    setPage(1);
  };
  const changeDay = (next: string) => {
    setDay(next);
    setPage(1);
  };

  const {
    state: load,
    retry,
    mutate,
  } = useRequest(`farmer-orders:${tab}:${day}:${page}`, () =>
    OrderApi.farmerList({ status: tab, date: day === 'all' ? undefined : day, page, pageSize: PAGE_SIZE }),
  );
  const data = load.kind === 'ready' ? load.data : null;

  const qLower = q.trim().toLowerCase();
  const rows = (data?.items ?? []).filter(
    (o) => !qLower || o.orderCode.toLowerCase().includes(qLower) || o.customerName.toLowerCase().includes(qLower),
  );

  const runAction = async (id: number, action: () => Promise<OrderDetailDto>, successText: string) => {
    setBusyId(id);
    try {
      await action();
      mutate((current) => ({
        ...current,
        items: current.items.filter((r) => r.orderId !== id),
        total: Math.max(0, current.total - 1),
      }));
      Notification.success({ text: successText });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
      if (isAxiosError(error) && error.response?.status === 409) retry();
    } finally {
      setBusyId(null);
    }
  };

  const columns: TableColumn<OrderListItemDto>[] = [
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
    {
      key: 'slot',
      label: t('col.pickup'),
      render: (r) => pickupLabel(r.pickupDate, `${r.pickupStart}–${r.pickupEnd}`),
    },
    { key: 'cut', label: t('col.cutoff'), render: (r) => cutoffLabel(r.cutoffAt) },
    { key: 'items', label: t('col.items'), align: 'num', render: (r) => r.itemCount },
    { key: 'total', label: t('col.total'), align: 'num', render: (r) => money(r.totalAmount) },
    { key: 'st', label: t('col.status'), render: (r) => <OrderStatusBadge status={r.status} /> },
    {
      key: 'a',
      label: '',
      align: 'actions',
      render: (r) => {
        const busy = busyId === r.orderId;
        if (r.status === 'placed')
          return (
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  void runAction(
                    r.orderId,
                    () => OrderApi.accept(r.orderId),
                    t('toast.accepted', { code: r.orderCode }),
                  )
                }
              >
                {t('action.accept')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => setConfirm({ kind: 'decline', orderId: r.orderId, orderCode: r.orderCode })}
              >
                {t('action.decline')}
              </Button>
            </div>
          );
        if (r.status === 'accepted')
          return (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() =>
                void runAction(r.orderId, () => OrderApi.markReady(r.orderId), t('toast.ready', { code: r.orderCode }))
              }
            >
              {t('action.markReady')}
            </Button>
          );
        if (r.status === 'ready')
          return (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => setConfirm({ kind: 'complete', orderId: r.orderId, orderCode: r.orderCode })}
            >
              {t('action.markCompleted')}
            </Button>
          );
        return (
          <ButtonLink variant="ghost" size="sm" to={`/farmer/orders/${r.orderId}`}>
            {t('action.view')}
          </ButtonLink>
        );
      },
    },
  ];

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 text-ink font-bold">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="border-line-strong bg-surface-raised focus-within:outline-focus flex w-full max-w-105 items-stretch overflow-hidden rounded-sm border-[1.5px] focus-within:outline-2 focus-within:outline-offset-1 [&_button]:rounded-none"
        >
          <label htmlFor="order-q" className="sr-only">
            {t('search.label')}
          </label>
          <input
            id="order-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search.placeholder')}
            className="text-body min-w-0 flex-1 bg-transparent px-3 outline-none"
          />
          <Button type="submit">{t('search.submit')}</Button>
        </form>
      </div>

      <DayChips
        legend={t('filter.day')}
        name="pickup-day"
        options={[
          { value: 'all', label: t('filter.all') },
          ...days.map((d) => ({ value: ymd(d), label: dayName(d.getDay(), 'long'), date: formatDayMonth(d) })),
        ]}
        value={day}
        onChange={changeDay}
      />

      <div className="flex flex-col gap-4">
        <Tabs
          label={t('tabsLabel')}
          value={tab}
          onChange={(id) => changeTab(id as OrderStatus)}
          tabs={STATUSES.map((s) => ({ id: s, label: t(`status.${s}`) }))}
        />
        {load.kind === 'loading' ? (
          <MarketCardSkeleton count={3} />
        ) : load.kind === 'error' ? (
          <LoadError noun={t('noun')} onRetry={retry} />
        ) : rows.length ? (
          <>
            <Table columns={columns} rows={rows} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-small text-ink-muted">{t('auditNote')}</span>
              <Pagination page={page} pages={pages} onChange={setPage} />
            </div>
          </>
        ) : (
          <DataState title={t(`empty.${tab}.title`)} text={t(`empty.${tab}.text`)} />
        )}
      </div>

      <Dialog
        open={confirm?.kind === 'decline'}
        title={t('decline.title', { code: confirm?.orderCode ?? '' })}
        tone="danger"
        onClose={() => setConfirm(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {t('decline.keep')}
            </Button>
            <Button
              variant="danger"
              disabled={busyId !== null}
              onClick={() => {
                if (confirm)
                  void runAction(
                    confirm.orderId,
                    () => OrderApi.decline(confirm.orderId, t(`decline.reasons.${reason}`)),
                    t('toast.declined', { code: confirm.orderCode }),
                  );
                setConfirm(null);
              }}
            >
              {t('decline.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('decline.text')}</p>
        <label className="text-ink-muted mt-2 block text-[13px] font-bold" htmlFor="decline-reason">
          {t('decline.reason')}
        </label>
        <select
          id="decline-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value as DeclineReason)}
          className="border-line-strong bg-surface-raised text-body mt-1 min-h-11 w-full rounded-sm border-[1.5px] px-3"
        >
          {DECLINE_REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`decline.reasons.${r}`)}
            </option>
          ))}
        </select>
      </Dialog>

      <Dialog
        open={confirm?.kind === 'complete'}
        title={t('complete.title', { code: confirm?.orderCode ?? '' })}
        onClose={() => setConfirm(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {t('complete.notYet')}
            </Button>
            <Button
              disabled={busyId !== null}
              onClick={() => {
                if (confirm)
                  void runAction(
                    confirm.orderId,
                    () => OrderApi.complete(confirm.orderId),
                    t('toast.completed', { code: confirm.orderCode }),
                  );
                setConfirm(null);
              }}
            >
              {t('action.markCompleted')}
            </Button>
          </>
        }
      >
        <p>{t('complete.text')}</p>
        <p className="text-ink-muted text-[14px]">{t('complete.auto')}</p>
      </Dialog>
    </div>
  );
};

export default FarmerOrdersPage;
