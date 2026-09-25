import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Banner } from '@/components/ui/banner';
import { BarList } from '@/components/ui/bar-list';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Kpi } from '@/components/ui/kpi';
import { Pagination } from '@/components/ui/pagination';
import { StockList } from '@/components/ui/stock-list';
import { Table, type TableColumn } from '@/components/ui/table';
import Tabs from '@/components/ui/tabs';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { marketName } from '@/data/catalog';
import {
  bestSellers,
  farmerOrderTotal,
  farmerOrders,
  overviewSpark,
  stockForSaturday,
  type FarmerOrderType,
} from '@/data/farmer';
import { dayName, formatClock, formatDayMonth, units, vnd, weekday } from '@/lib/format';
import type { OrderStatus } from '@/types/order.types';
import Notification from '@/utils/notification';
import LiveClock from './LiveClock';

const TABS = [
  { id: 'new', label: 'tabs.new', status: 'placed' as OrderStatus },
  { id: 'acc', label: 'tabs.acc', status: 'accepted' as OrderStatus },
  { id: 'ready', label: 'tabs.ready', status: 'ready' as OrderStatus },
  { id: 'done', label: 'tabs.done', status: 'completed' as OrderStatus },
] as const;

const DECLINE_REASONS = [
  'decline.reasons.stock',
  'decline.reasons.day',
  'decline.reasons.time',
  'decline.reasons.other',
] as const;

const SAT = new Date(2026, 8, 26);
const SUN = new Date(2026, 8, 27);
const dayDate = (d: Date) => `${weekday(d)} ${formatDayMonth(d)}`;

/** FR-065 FR-068 FR-069 — Farmer dashboard: KPIs, incoming orders, stock for Saturday and best sellers. */
const FarmerOverviewPage = () => {
  const { t, i18n } = useTranslation('FarmerOverview');
  const [tab, setTab] = useState<'new' | 'acc' | 'ready' | 'done'>('new');
  const [declineCode, setDeclineCode] = useState<string | null>(null);
  const [reason, setReason] = useState<string>(DECLINE_REASONS[0]);

  const by = (status: OrderStatus) => farmerOrders.filter((o) => o.status === status);
  const awaiting = by('placed');

  const columns: TableColumn<FarmerOrderType>[] = [
    { key: 'code', label: t('col.order') },
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
    { key: 'slot', label: t('col.pickup'), render: (r) => `${r.date} · ${r.slot}` },
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
              <Button
                size="sm"
                onClick={() =>
                  Notification.success({
                    title: t('toast.acceptedTitle'),
                    text: t('toast.acceptedText', { code: r.code, who: r.who }),
                  })
                }
              >
                {t('actions.accept')}
              </Button>
              <Button variant="danger" size="sm" onClick={() => setDeclineCode(r.code)}>
                {t('actions.decline')}
              </Button>
            </div>
          );
        if (r.status === 'accepted')
          return (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                Notification.success({ title: t('toast.readyTitle'), text: t('toast.readyText', { code: r.code }) })
              }
            >
              {t('actions.ready')}
            </Button>
          );
        if (r.status === 'ready')
          return (
            <Button
              size="sm"
              onClick={() =>
                Notification.success({
                  title: t('toast.completedTitle'),
                  text: t('toast.completedText', { code: r.code }),
                })
              }
            >
              {t('actions.complete')}
            </Button>
          );
        return (
          <ButtonLink variant="ghost" size="sm" to={`/farmer/orders/${r.code.replace('#', '')}`}>
            {t('actions.view')}
          </ButtonLink>
        );
      },
    },
  ];

  const activeTab = TABS.find((x) => x.id === tab)!;
  const rows = by(activeTab.status);
  const captions: Record<typeof tab, string> = {
    new: t('captions.new', { sat: dayDate(SAT), sun: dayDate(SUN) }),
    acc: t('tabs.acc'),
    ready: t('captions.ready'),
    done: t('tabs.done'),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-overline text-ink-muted m-0">
            <LiveClock /> · {t('overline', { market: marketName(1), day: dayDate(SAT) })}
          </p>
          <h1 className="font-hand text-h1">{t('greeting', { name: 'Cô Tư' })}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink variant="secondary" to="/farmer/stock">
            {t('applyTemplate')}
          </ButtonLink>
          <ButtonLink to="/farmer/products/new">{t('addProduct')}</ButtonLink>
        </div>
      </div>

      <Banner variant="warning" title={t('banner.title', { count: 4, closing: 3, time: formatClock('19:00') })}>
        {t('banner.text')}
      </Banner>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi
          label={t('kpi.orders')}
          value="128"
          note={t('kpi.ordersNote', { count: 23 })}
          delta={{ pct: 18.9, vs: t('kpi.vsAugust') }}
          spark={overviewSpark.orders}
          href="/farmer/history"
          linkLabel={t('kpi.openHistory')}
        />
        <Kpi
          label={t('tabs.new')}
          value={awaiting.length}
          note={
            <Trans
              t={t}
              i18nKey="kpi.awaitingNote"
              count={3}
              values={{ time: formatClock('19:00'), date: formatDayMonth(new Date(2026, 8, 25)) }}
              components={{ b: <b /> }}
            />
          }
          delta={{ pct: 33.3, good: false, vs: t('kpi.vsThursday') }}
          highlight
          href="/farmer/orders"
          linkLabel={t('kpi.openIncoming')}
        />
        <Kpi
          label={t('kpi.revenue')}
          value={new Intl.NumberFormat(i18n.language).format(8_450_000)}
          note={t('kpi.revenueNote')}
          delta={{ pct: 21.4, vs: t('kpi.vsAugust') }}
          spark={overviewSpark.revenue}
          href="/farmer/history"
          linkLabel={t('kpi.openHistory')}
        />
        <Kpi
          label={t('kpi.best')}
          value="Water spinach"
          note={t('kpi.bestNote', { qty: units(64, 'bunch') })}
          delta={{ pct: 11.2, vs: t('kpi.vsAugust') }}
          href="/farmer/products"
          linkLabel={t('kpi.openProducts')}
        />
      </div>
      <p className="text-small text-ink-muted -mt-2">{t('kpi.note')}</p>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h2">{t('incoming.title')}</h2>
          <ButtonLink variant="ghost" to="/farmer/orders">
            {t('incoming.all')}
          </ButtonLink>
        </div>
        <Tabs
          label={t('incoming.title')}
          value={tab}
          onChange={(id) => setTab(id as typeof tab)}
          tabs={TABS.map((x) => ({
            id: x.id,
            label: t(x.label),
            count: x.id === 'done' ? undefined : by(x.status).length,
          }))}
        />
        <Table
          caption={captions[tab]}
          columns={columns}
          rows={rows}
          rowClassName={(r) => (r.isNew ? '!bg-highlight' : undefined)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-small text-ink-muted">{t('incoming.note')}</span>
          <Pagination page={1} pages={1} onChange={() => {}} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h3">{t('stock.title', { day: dayName(6, 'long') })}</h2>
            <ButtonLink variant="ghost" size="sm" to="/farmer/stock">
              {t('stock.link')}
            </ButtonLink>
          </div>
          <StockList rows={stockForSaturday} />
          <p className="text-small text-ink-muted">{t('stock.note')}</p>
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h3">{t('best.title')}</h2>
            <ButtonLink variant="ghost" size="sm" to="/farmer/history">
              {t('best.link')}
            </ButtonLink>
          </div>
          <p className="text-small text-ink-muted -mt-1">{t('best.note')}</p>
          <BarList rows={bestSellers} />
        </Card>
      </section>

      <p className="text-caption text-ink-muted">{t('protoNote')}</p>

      <Dialog
        open={declineCode !== null}
        title={t('decline.title', { code: declineCode ?? '' })}
        tone="danger"
        onClose={() => setDeclineCode(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeclineCode(null)}>
              {t('decline.keep')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                Notification.success({
                  title: t('toast.declinedTitle'),
                  text: t('toast.declinedText', { code: declineCode }),
                });
                setDeclineCode(null);
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
          onChange={(e) => setReason(e.target.value)}
          className="border-line-strong bg-surface-raised text-body mt-1 min-h-11 w-full rounded-sm border-[1.5px] px-3"
        >
          {DECLINE_REASONS.map((r) => (
            <option key={r} value={r}>
              {t(r)}
            </option>
          ))}
        </select>
      </Dialog>
    </div>
  );
};

export default FarmerOverviewPage;
