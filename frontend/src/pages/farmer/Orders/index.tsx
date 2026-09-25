import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import DayChips from '@/components/DayChips';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { Button, ButtonLink } from '@/components/ui/button';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, type TableColumn } from '@/components/ui/table';
import Tabs from '@/components/ui/tabs';
import { farmerOrders, farmerOrderTotal, type FarmerOrderType } from '@/data/farmer';
import { dayName, formatDayMonth, vnd } from '@/lib/format';
import type { OrderStatus } from '@/types/order.types';
import Notification from '@/utils/notification';
import { clockRange, cutoffLabel, marketDay } from './demoDates';

const STATUSES: OrderStatus[] = ['placed', 'accepted', 'ready', 'completed', 'declined', 'cancelled'];

/** Market mornings on screen: the Friday-to-Sunday weekend of the seeded orders. */
const DAY_OPTIONS = [
  { value: 'fri', dow: 5, date: new Date(2026, 8, 25) },
  { value: 'sat', dow: 6, date: new Date(2026, 8, 26) },
  { value: 'sun', dow: 0, date: new Date(2026, 8, 27) },
];
/** How the seeded orders spell the day (data, not UI) */
const DAY_PREFIX: Record<string, string> = { fri: 'Fri', sat: 'Sat', sun: 'Sun' };

const DECLINE_REASONS = ['stock', 'day', 'time', 'other'] as const;
type DeclineReason = (typeof DECLINE_REASONS)[number];

type ConfirmDialog = { kind: 'decline' | 'complete'; code: string } | null;

/**
 * FR-065 FR-066 — Incoming orders: accept, decline, mark ready and complete, one status move at a time (D-04). Nothing
 * is stored here: a reload gives the seeded orders back, matching the prototype.
 */
const FarmerOrdersPage = () => {
  const { t } = useTranslation('FarmerOrders');
  const [rows, setRows] = useState<FarmerOrderType[]>(farmerOrders);
  const [tab, setTab] = useState<OrderStatus>('placed');
  const [day, setDay] = useState('all');
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState<ConfirmDialog>(null);
  const [reason, setReason] = useState<DeclineReason>(DECLINE_REASONS[0]);

  const move = (code: string, to: OrderStatus, message: string) => {
    setRows((prev) => prev.map((o) => (o.code === code ? { ...o, status: to, isNew: false } : o)));
    Notification.success({ text: message });
  };

  const qLower = q.trim().toLowerCase();
  const filtered = rows.filter((o) => {
    if (day !== 'all' && !o.date.startsWith(DAY_PREFIX[day])) return false;
    if (qLower && !o.code.toLowerCase().includes(qLower) && !o.who.toLowerCase().includes(qLower)) return false;
    return true;
  });
  const by = (status: OrderStatus) => filtered.filter((o) => o.status === status);

  const columns: TableColumn<FarmerOrderType>[] = [
    {
      key: 'code',
      label: t('col.order'),
      render: (r) => <Link to={`/farmer/orders/${r.code.replace('#', '')}`}>{r.code}</Link>,
    },
    {
      key: 'who',
      label: t('col.customer'),
      render: (r) => (
        <>
          {r.who}
          <span className="text-ink-muted mt-0.5 block text-[13px] font-normal">{r.phone}</span>
        </>
      ),
    },
    { key: 'slot', label: t('col.pickup'), render: (r) => `${marketDay(r.date)} · ${clockRange(r.slot)}` },
    { key: 'cut', label: t('col.cutoff'), render: (r) => cutoffLabel(r.cutoff) },
    { key: 'items', label: t('col.items'), align: 'num', render: (r) => r.items.length },
    { key: 'total', label: t('col.total'), align: 'num', render: (r) => vnd(farmerOrderTotal(r)) },
    { key: 'st', label: t('col.status'), render: (r) => <OrderStatusBadge status={r.status} /> },
    {
      key: 'a',
      label: '',
      align: 'actions',
      render: (r) => {
        if (r.status === 'placed')
          return (
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => move(r.code, 'accepted', t('toast.accepted', { code: r.code }))}>
                {t('action.accept')}
              </Button>
              <Button variant="danger" size="sm" onClick={() => setConfirm({ kind: 'decline', code: r.code })}>
                {t('action.decline')}
              </Button>
            </div>
          );
        if (r.status === 'accepted')
          return (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => move(r.code, 'ready', t('toast.ready', { code: r.code }))}
            >
              {t('action.markReady')}
            </Button>
          );
        if (r.status === 'ready')
          return (
            <Button size="sm" onClick={() => setConfirm({ kind: 'complete', code: r.code })}>
              {t('action.markCompleted')}
            </Button>
          );
        return (
          <ButtonLink variant="ghost" size="sm" to={`/farmer/orders/${r.code.replace('#', '')}`}>
            {t('action.view')}
          </ButtonLink>
        );
      },
    },
  ];

  const activeRows = by(tab);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
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

      <div className="flex flex-wrap items-end gap-6">
        <DayChips
          legend={t('filter.day')}
          name="pickup-day"
          options={[
            { value: 'all', label: t('filter.all') },
            ...DAY_OPTIONS.map((d) => ({
              value: d.value,
              label: dayName(d.dow, 'long'),
              date: formatDayMonth(d.date),
            })),
          ]}
          value={day}
          onChange={setDay}
        />
        <SelectField
          id="mk"
          label={t('filter.market')}
          options={[t('filter.bothMarkets'), 'Thảo Điền Weekend Market', 'Thủ Đức Farmers Market']}
        />
      </div>

      <div className="flex flex-col gap-4">
        <Tabs
          label={t('tabsLabel')}
          value={tab}
          onChange={(id) => setTab(id as OrderStatus)}
          tabs={STATUSES.map((s) => ({ id: s, label: t(`status.${s}`), count: by(s).length }))}
        />
        {activeRows.length ? (
          <Table columns={columns} rows={activeRows} rowClassName={(r) => (r.isNew ? '!bg-highlight' : undefined)} />
        ) : (
          <DataState title={t(`empty.${tab}.title`)} text={t(`empty.${tab}.text`)} />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-small text-ink-muted">{t('auditNote')}</span>
          <Pagination page={1} pages={1} onChange={() => {}} />
        </div>
      </div>

      <Dialog
        open={confirm?.kind === 'decline'}
        title={t('decline.title', { code: confirm?.code ?? '' })}
        tone="danger"
        onClose={() => setConfirm(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {t('decline.keep')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm) move(confirm.code, 'declined', t('toast.declined', { code: confirm.code }));
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
        title={t('complete.title', { code: confirm?.code ?? '' })}
        onClose={() => setConfirm(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {t('complete.notYet')}
            </Button>
            <Button
              onClick={() => {
                if (confirm) move(confirm.code, 'completed', t('toast.completed', { code: confirm.code }));
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
