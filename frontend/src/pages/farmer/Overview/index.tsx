import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import ChatApi from '@/api-requests/chat.requests';
import OrderApi, { type OrderDetailDto, type OrderListItemDto } from '@/api-requests/order.requests';
import ProductApi from '@/api-requests/product.requests';
import { FarmerReportApi } from '@/api-requests/report.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { Banner } from '@/components/ui/banner';
import { BarList } from '@/components/ui/bar-list';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Kpi } from '@/components/ui/kpi';
import { Table, type TableColumn } from '@/components/ui/table';
import Tabs from '@/components/ui/tabs';
import useRequest from '@/hooks/useRequest';
import { pickupLabel, money } from '@/lib/format';
import type { OrderStatus } from '@/types/order.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import LiveClock from './LiveClock';
import ShelfLifeStrikes from './ShelfLifeStrikes';
import { stockNow } from './stockNow';

const TABS = [
  { id: 'new', label: 'tabs.new', status: 'placed' as OrderStatus },
  { id: 'acc', label: 'tabs.acc', status: 'accepted' as OrderStatus },
  { id: 'ready', label: 'tabs.ready', status: 'ready' as OrderStatus },
  { id: 'done', label: 'tabs.done', status: 'completed' as OrderStatus },
] as const;
type TabId = (typeof TABS)[number]['id'];

const DECLINE_REASONS = ['stock', 'day', 'time', 'other'] as const;
type DeclineReason = (typeof DECLINE_REASONS)[number];

const STOCK_ROWS = 6;
const BEST_SELLER_LIMIT = 5;

const FarmerOverviewPage = () => {
  const { t } = useTranslation('FarmerOverview');
  const { t: tc } = useTranslation();
  const [tab, setTab] = useState<TabId>('new');
  const [declineOrder, setDeclineOrder] = useState<{ orderId: number; orderCode: string } | null>(null);
  const [reason, setReason] = useState<DeclineReason>(DECLINE_REASONS[0]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const { state: kpiLoad, retry: retryKpi } = useRequest('farmer-dash', () => FarmerReportApi.dashboard());
  const { state: briefingLoad } = useRequest('farmer-briefing', () => ChatApi.farmerBriefing());
  const activeTab = TABS.find((x) => x.id === tab)!;
  const {
    state: ordersLoad,
    retry: retryOrders,
    mutate: mutateOrders,
  } = useRequest(`farmer-overview-orders:${tab}`, () =>
    OrderApi.farmerList({ status: activeTab.status, pageSize: 10 }),
  );
  const { state: stockLoad, retry: retryStock } = useRequest('farmer-my-products', () => ProductApi.mine());
  const { state: bestLoad, retry: retryBest } = useRequest('farmer-best-sellers', () =>
    FarmerReportApi.bestSellers({ limit: BEST_SELLER_LIMIT }),
  );

  const runAction = async (id: number, action: () => Promise<OrderDetailDto>, successText: string) => {
    setBusyId(id);
    try {
      await action();
      mutateOrders((current) => ({
        ...current,
        items: current.items.filter((r) => r.orderId !== id),
        total: Math.max(0, current.total - 1),
      }));
      Notification.success({ text: successText });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
      if (isAxiosError(error) && error.response?.status === 409) retryOrders();
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
                    t('toast.acceptedText', { code: r.orderCode, who: r.customerName }),
                  )
                }
              >
                {t('actions.accept')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => setDeclineOrder({ orderId: r.orderId, orderCode: r.orderCode })}
              >
                {t('actions.decline')}
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
                void runAction(
                  r.orderId,
                  () => OrderApi.markReady(r.orderId),
                  t('toast.readyText', { code: r.orderCode }),
                )
              }
            >
              {t('actions.ready')}
            </Button>
          );
        if (r.status === 'ready')
          return (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void runAction(
                  r.orderId,
                  () => OrderApi.complete(r.orderId),
                  t('toast.completedText', { code: r.orderCode }),
                )
              }
            >
              {t('actions.complete')}
            </Button>
          );
        return (
          <ButtonLink variant="ghost" size="sm" to={`/farmer/orders/${r.orderId}`}>
            {t('actions.view')}
          </ButtonLink>
        );
      },
    },
  ];

  const dashboard = kpiLoad.kind === 'ready' ? kpiLoad.data : null;
  const briefing = briefingLoad.kind === 'ready' ? briefingLoad.data : null;
  const orders = ordersLoad.kind === 'ready' ? ordersLoad.data.items : [];
  const stock = stockLoad.kind === 'ready' ? stockNow(stockLoad.data, STOCK_ROWS) : [];
  const best = bestLoad.kind === 'ready' ? bestLoad.data : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-overline text-ink-muted m-0">
            <LiveClock />
          </p>
          <h1 className="text-h1 text-ink font-bold">{t('title')}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink variant="secondary" to="/farmer/stock">
            {t('editTemplate')}
          </ButtonLink>
          <ButtonLink to="/farmer/products/new">{t('addProduct')}</ButtonLink>
        </div>
      </div>

      {briefingLoad.kind === 'ready' && briefing && (
        <Banner
          variant={briefing.cutoffAlreadyPassed > 0 ? 'warning' : 'info'}
          title={
            briefing.marketsToday.length > 0
              ? t('briefing.title', { markets: briefing.marketsToday.join(', ') })
              : t('briefing.titleNoMarket')
          }
        >
          <ul className="m-0 flex list-disc flex-col gap-1 pl-4.5">
            <li>{t('briefing.orders', { count: briefing.ordersToday })}</li>
            {briefing.waitingToBeAccepted > 0 && (
              <li>{t('briefing.waiting', { count: briefing.waitingToBeAccepted })}</li>
            )}
            {briefing.cutoffAlreadyPassed > 0 && (
              <li>{t('briefing.cutoffPassed', { count: briefing.cutoffAlreadyPassed })}</li>
            )}
            {briefing.soldOutProducts > 0 && <li>{t('briefing.soldOut', { count: briefing.soldOutProducts })}</li>}
            {briefing.lowStockProducts > 0 && <li>{t('briefing.lowStock', { count: briefing.lowStockProducts })}</li>}
          </ul>
        </Banner>
      )}

      {dashboard && dashboard.pendingOrders > 0 && (
        <Banner variant="warning" title={t('banner.title', { count: dashboard.pendingOrders })}>
          {t('banner.text')}
        </Banner>
      )}

      <ShelfLifeStrikes />

      {kpiLoad.kind === 'loading' ? (
        <MarketCardSkeleton count={4} />
      ) : kpiLoad.kind === 'error' ? (
        <LoadError noun={t('kpi.noun')} onRetry={retryKpi} />
      ) : (
        dashboard && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <Kpi
              label={t('kpi.orders')}
              value={dashboard.totalOrders}
              href="/farmer/history"
              linkLabel={t('kpi.openHistory')}
            />
            <Kpi
              label={t('kpi.pending')}
              value={dashboard.pendingOrders}
              highlight
              href="/farmer/orders"
              linkLabel={t('kpi.openIncoming')}
            />
            <Kpi
              label={t('kpi.revenue')}
              value={money(dashboard.revenueTotal)}
              href="/farmer/history"
              linkLabel={t('kpi.openHistory')}
            />
            <Kpi
              label={t('kpi.revenueMonth')}
              value={money(dashboard.revenueThisMonth)}
              href="/farmer/history"
              linkLabel={t('kpi.openHistory')}
            />
          </div>
        )
      )}

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
          onChange={(id) => setTab(id as TabId)}
          tabs={TABS.map((x) => ({ id: x.id, label: t(x.label) }))}
        />
        {ordersLoad.kind === 'loading' ? (
          <MarketCardSkeleton count={3} />
        ) : ordersLoad.kind === 'error' ? (
          <LoadError noun={t('incoming.noun')} onRetry={retryOrders} />
        ) : orders.length ? (
          <Table columns={columns} rows={orders} />
        ) : (
          <DataState title={t('incoming.empty.title')} text={t('incoming.empty.text')} />
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h3">{t('stock.title')}</h2>
            <ButtonLink variant="ghost" size="sm" to="/farmer/stock">
              {t('stock.link')}
            </ButtonLink>
          </div>
          {stockLoad.kind === 'loading' ? (
            <MarketCardSkeleton count={2} />
          ) : stockLoad.kind === 'error' ? (
            <LoadError noun={t('stock.noun')} onRetry={retryStock} />
          ) : stock.length ? (
            <BarList rows={stock} />
          ) : (
            <DataState title={t('stock.empty.title')} text={t('stock.empty.text')} />
          )}
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h3">{t('best.title')}</h2>
            <ButtonLink variant="ghost" size="sm" to="/farmer/history">
              {t('best.link')}
            </ButtonLink>
          </div>
          {bestLoad.kind === 'loading' ? (
            <MarketCardSkeleton count={2} />
          ) : bestLoad.kind === 'error' ? (
            <LoadError noun={t('best.noun')} onRetry={retryBest} />
          ) : best.length ? (
            <BarList rows={best.map((b) => ({ label: b.name, value: b.quantitySold }))} />
          ) : (
            <DataState title={t('best.empty.title')} text={t('best.empty.text')} />
          )}
        </Card>
      </section>

      <Dialog
        open={declineOrder !== null}
        title={t('decline.title', { code: declineOrder?.orderCode ?? '' })}
        tone="danger"
        onClose={() => setDeclineOrder(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeclineOrder(null)}>
              {t('decline.keep')}
            </Button>
            <Button
              variant="danger"
              disabled={busyId !== null}
              onClick={() => {
                if (declineOrder)
                  void runAction(
                    declineOrder.orderId,
                    () => OrderApi.decline(declineOrder.orderId, t(`decline.reasons.${reason}`)),
                    t('toast.declinedText', { code: declineOrder.orderCode }),
                  );
                setDeclineOrder(null);
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
    </div>
  );
};

export default FarmerOverviewPage;
