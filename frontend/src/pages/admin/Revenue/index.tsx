import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BarList } from '@/components/ui/bar-list';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ColumnChart } from '@/components/ui/column-chart';
import { Kpi } from '@/components/ui/kpi';
import { PeriodBar } from '@/components/ui/period-bar';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_FARMERS_PATH, ADMIN_PRICING_PATH } from '@/constants/nav';
import { changePct, period, platformRevenue, series, type RevenueSource, type RevenueStall } from '@/data/admin';
import { vnd } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

/** The period on screen and the one it is compared with (the seeded figures are September against August 2026). */
const PERIOD = new Date(2026, 8, 1);
const PREVIOUS = new Date(2026, 7, 1);

const R = platformRevenue;

/** Signed percentage, coloured up or down. The sign carries the meaning, not the colour alone. */
const Change = ({ value }: { value: number }) => (
  <span className={Helper.cn('font-bold', value >= 0 ? 'text-accent-ink' : 'text-danger')}>
    {value >= 0 ? '+' : ''}
    {value}%
  </span>
);

/**
 * What MarketLink itself earns, and from which stalls. A different number from the money the markets take, and the two
 * are never added together.
 *
 * Charging Farmers is outside the SRS, so the screen opens with that warning and every figure is demo data.
 */
const AdminRevenuePage = () => {
  const { t, i18n } = useTranslation('AdminRevenue');
  const monthYear = (d: Date) => new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(d);
  const month = (d: Date) => new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(d);
  const num = (n: number, digits = 0) =>
    new Intl.NumberFormat(i18n.language, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  /** The per-day chart reads in thousands; the raw đồng figures are in the table underneath it. */
  const thousands = (v: number) => num(Math.round(v / 1000));

  const take = (R.total / R.gmv) * 100;
  const takePrev = (R.totalPrev / R.gmvPrev) * 100;

  const sourceColumns: TableColumn<RevenueSource>[] = [
    { key: 'name', label: t('col.source') },
    { key: 'sold', label: t('col.whatWasSold') },
    { key: 'stalls', label: t('col.stalls'), align: 'num' },
    { key: 'prev', label: month(PREVIOUS), align: 'num', render: (r) => vnd(r.prev) },
    { key: 'amount', label: month(PERIOD), align: 'num', render: (r) => vnd(r.amount) },
    {
      key: 'change',
      label: t('col.change'),
      align: 'num',
      render: (r) => <Change value={changePct(r.amount, r.prev)} />,
    },
    { key: 'share', label: t('col.share'), align: 'num', render: (r) => `${Math.round((r.amount / R.total) * 100)}%` },
  ];

  const stallColumns: TableColumn<RevenueStall>[] = [
    {
      key: 'stall',
      label: t('col.stall'),
      render: (r) => (
        <>
          <Link to={ADMIN_FARMERS_PATH} className="text-brand underline">
            <b>{r.stall}</b>
          </Link>
          <span className="text-ink-muted block text-[13px]">{r.share}</span>
        </>
      ),
    },
    { key: 'orders', label: t('col.completedOrders'), align: 'num' },
    { key: 'spent', label: t('col.paidMarketLink'), align: 'num', render: (r) => vnd(r.spent) },
    {
      key: 'shareOf',
      label: t('col.shareOfRevenue'),
      align: 'num',
      render: (r) => `${Math.round((r.spent / R.total) * 100)}%`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to={ADMIN_PRICING_PATH} variant="secondary">
            {t('action.pricing')}
          </ButtonLink>
          <Button
            variant="secondary"
            onClick={() => Notification.success({ title: t('export.title'), text: t('export.text') })}
          >
            {t('export.button')}
          </Button>
        </div>
      </div>

      <Banner variant="warning" title={t('scope.title')}>
        {t('scope.text')}
      </Banner>

      <PeriodBar
        from={period.from}
        to={period.to}
        label={monthYear(PERIOD)}
        days={t('days', { count: 30 })}
        compare={monthYear(PREVIOUS)}
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi
          label={t('kpi.revenue')}
          value={num(R.total)}
          note={t('kpi.revenueNote')}
          delta={{ pct: changePct(R.total, R.totalPrev) }}
          highlight
        />
        <Kpi
          label={t('kpi.takeRate')}
          value={`${num(take, 1)}%`}
          note={t('kpi.takeRateNote')}
          delta={{ pct: Math.round((take - takePrev) * 10) / 10, unit: t('points') }}
        />
        <Kpi
          label={t('kpi.payingStalls')}
          value={t('kpi.ofTotal', { count: R.payingStalls, total: R.approvedStalls })}
          note={t('kpi.payingStallsNote')}
          delta={{ pct: changePct(R.payingStalls, R.payingStallsPrev) }}
        />
        <Kpi
          label={t('kpi.average')}
          value={num(R.total / R.payingStalls)}
          note={t('kpi.averageNote')}
          delta={{ pct: changePct(R.total / R.payingStalls, R.totalPrev / R.payingStallsPrev) }}
        />
      </div>

      <Banner variant="info" title={t('gmv.title', { gmv: vnd(R.gmv), month: month(PERIOD) })}>
        {t('gmv.text', { total: vnd(R.total), pct: num(take, 1) })}
      </Banner>

      <Card className="flex flex-col gap-3 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3">{t('perDay.title')}</h2>
          <p className="text-small text-ink-muted">{t('perDay.note')}</p>
        </div>
        <ColumnChart
          caption={t('perDay.caption', { now: month(PERIOD), prev: month(PREVIOUS) })}
          axisLabel={t('axis.dayOfMonth')}
          labels={series.dayLabels}
          format={thousands}
          series={[
            { name: month(PERIOD), values: R.dailyNow },
            { name: month(PREVIOUS), values: R.dailyPrev, compare: true },
          ]}
        />
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h2">{t('sources.title')}</h2>
          <span className="text-small text-ink-muted">{t('sources.note', { count: R.sources.length })}</span>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="flex flex-col gap-3 p-6">
            <h3 className="text-h3">{t('sources.share')}</h3>
            <BarList rows={R.sources.map((s) => ({ label: s.name, value: s.amount }))} format={vnd} />
          </Card>
          <Card className="flex flex-col gap-3 p-6">
            <h3 className="text-h3">{t('sources.against', { prev: month(PREVIOUS) })}</h3>
            <ColumnChart
              height={200}
              caption={t('sources.caption', { now: month(PERIOD), prev: month(PREVIOUS) })}
              axisLabel={t('axis.source')}
              labels={R.sourceShort}
              format={thousands}
              series={[
                { name: month(PERIOD), values: R.sources.map((s) => s.amount) },
                { name: month(PREVIOUS), values: R.sources.map((s) => s.prev), compare: true },
              ]}
            />
          </Card>
        </div>
        <Table columns={sourceColumns} rows={R.sources} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h2">{t('whoPays.title')}</h2>
          <span className="text-small text-ink-muted">
            {t('whoPays.note', { paying: R.payingStalls, total: R.approvedStalls, month: month(PERIOD) })}
          </span>
        </div>
        <Table columns={stallColumns} rows={R.byStall} />
        <p className="text-small text-ink-muted">{t('whoPays.free')}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">{t('credit.title')}</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <Kpi label={t('credit.bought')} value={num(R.credit.boughtThisPeriod)} note={t('credit.boughtNote')} />
          <Kpi label={t('credit.spent')} value={num(R.credit.spentThisPeriod)} note={t('credit.spentNote')} />
          <Kpi
            label={t('credit.unspent')}
            value={num(R.credit.outstanding)}
            note={t('credit.unspentNote', { count: R.credit.stallsHolding })}
            highlight
          />
          <Kpi label={t('credit.owed')} value={num(R.credit.outstanding)} note={t('credit.owedNote')} />
        </div>
        <p className="text-small text-ink-muted">{t('credit.note')}</p>
      </section>
    </div>
  );
};

export default AdminRevenuePage;
