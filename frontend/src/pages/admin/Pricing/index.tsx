import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BarList } from '@/components/ui/bar-list';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectField } from '@/components/ui/input';
import { Kpi } from '@/components/ui/kpi';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_REVENUE_PATH } from '@/constants/nav';
import { platformRevenue, pricing, type PricingExtra, type PricingPin } from '@/data/admin';
import { vnd } from '@/lib/format';
import Notification from '@/utils/notification';

const CURRENCIES = ['dong', 'usd', 'eur'] as const;
const ROUNDINGS = ['thousand', 'fiveHundred', 'none'] as const;
const NOTICES = ['7', '14', '30'] as const;

/** Number input sized for a price in đồng, right-aligned so the columns line up. */
const MoneyInput = ({ value, label }: { value: number; label: string }) => (
  <input
    type="number"
    step={1000}
    defaultValue={value}
    aria-label={label}
    className="border-line-strong bg-surface-raised focus:outline-focus min-h-9 w-30 rounded-sm border-[1.5px] px-2 text-right focus:outline-2"
  />
);

/**
 * What a stall gets free and what it pays to go beyond it. Charging Farmers is outside the SRS — the requirements rule
 * out a payment gateway — so the screen opens with that warning and every figure is demo data.
 */
const AdminPricingPage = () => {
  const { t, i18n } = useTranslation('AdminPricing');
  const num = (n: number, digits = 0) =>
    new Intl.NumberFormat(i18n.language, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

  const [currency, setCurrency] = useState<string>(CURRENCIES[0]);
  const [rounding, setRounding] = useState<string>(ROUNDINGS[0]);
  const [notice, setNotice] = useState<string>(NOTICES[0]);
  const [free, setFree] = useState({
    listings: String(pricing.free.listingsPerDay),
    bumps: String(pricing.free.bumpsPerMonth),
  });
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjust, setAdjust] = useState({ pct: '4.5', when: 'notice' });

  const extraColumns: TableColumn<PricingExtra>[] = [
    { key: 'name', label: t('col.whatStallBuys') },
    {
      key: 'price',
      label: t('col.priceInDong'),
      align: 'num',
      render: (r) => <MoneyInput value={r.price} label={t('col.priceOf', { name: r.name })} />,
    },
    { key: 'sold', label: t('col.soldInPeriod'), align: 'num' },
    { key: 'earned', label: t('col.earned'), align: 'num', render: (r) => vnd(r.price * r.sold) },
  ];

  const pinColumns: TableColumn<PricingPin>[] = [
    { key: 'name', label: t('col.where') },
    {
      key: 'slots',
      label: t('col.slotsAtOnce'),
      align: 'num',
      render: (r) => (
        <input
          type="number"
          defaultValue={r.slots}
          aria-label={t('col.slotsOf', { name: r.name })}
          className="border-line-strong bg-surface-raised focus:outline-focus min-h-9 w-18 rounded-sm border-[1.5px] px-2 text-right focus:outline-2"
        />
      ),
    },
    ...[0, 1, 2].map((i) => ({
      key: `d${i}`,
      label: t('col.days', { count: pricing.pins[0].days[i][0] }),
      align: 'num' as const,
      render: (r: PricingPin) => (
        <MoneyInput value={r.days[i][1]} label={t('col.priceForDays', { name: r.name, count: r.days[i][0] })} />
      ),
    })),
  ];

  const settings: { key: 'currency' | 'rounding' | 'notice'; control: ReactNode }[] = [
    {
      key: 'currency',
      control: (
        <SelectField
          id="pricing-currency"
          label={t('set.currency.title')}
          hideLabel
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          options={CURRENCIES.map((c) => ({ value: c, label: t(`currency.${c}`) }))}
        />
      ),
    },
    {
      key: 'rounding',
      control: (
        <SelectField
          id="pricing-rounding"
          label={t('set.rounding.title')}
          hideLabel
          value={rounding}
          onChange={(e) => setRounding(e.target.value)}
          options={ROUNDINGS.map((r) => ({ value: r, label: t(`rounding.${r}`) }))}
        />
      ),
    },
    {
      key: 'notice',
      control: (
        <SelectField
          id="pricing-notice"
          label={t('set.notice.title')}
          hideLabel
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          options={NOTICES.map((n) => ({ value: n, label: t('days', { count: Number(n) }) }))}
        />
      ),
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
          <ButtonLink to={ADMIN_REVENUE_PATH} variant="secondary">
            {t('action.seeEarned')}
          </ButtonLink>
          <Button variant="secondary" onClick={() => setAdjustOpen(true)}>
            {t('action.adjustAll')}
          </Button>
          <Button onClick={() => Notification.success({ text: t('toast.saved') })}>{t('action.save')}</Button>
        </div>
      </div>

      <Banner variant="warning" title={t('scope.title')}>
        {t('scope.text')}
      </Banner>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi
          label={t('kpi.revenue')}
          value={num(platformRevenue.total)}
          note={t('kpi.revenueNote')}
          delta={{ pct: 34.6 }}
          highlight
          href={ADMIN_REVENUE_PATH}
          linkLabel={t('kpi.revenueLink')}
        />
        <Kpi
          label={t('kpi.paying')}
          value={num(pricing.stats.payingStalls)}
          note={t('kpi.payingNote', { total: pricing.stats.approvedStalls })}
          delta={{ pct: 25 }}
        />
        <Kpi
          label={t('kpi.pinnedDays')}
          value={num(pricing.stats.pinnedDaysSold)}
          note={t('kpi.pinnedDaysNote', { total: pricing.stats.pinnedDaysAvailable })}
          delta={{ pct: 21.4 }}
        />
        <Kpi
          label={t('kpi.overLimit')}
          value={num(pricing.stats.stallsOverFreeLimit)}
          note={t('kpi.overLimitNote')}
          delta={{ pct: 0 }}
        />
      </div>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-h3">{t('set.title')}</h2>
        <ul className="m-0 flex flex-col p-0">
          {settings.map((row, i) => (
            <li
              key={row.key}
              className={`flex flex-wrap items-center justify-between gap-4 py-4 ${i > 0 ? 'border-line border-t' : ''}`}
            >
              <div className="max-w-140">
                <b>{t(`set.${row.key}.title`)}</b>
                <p className="text-small text-ink-muted">{t(`set.${row.key}.text`)}</p>
              </div>
              <div className="min-w-55">{row.control}</div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-h3">{t('free.title')}</h2>
        <p className="text-small text-ink-muted">{t('free.text')}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="free-listings"
            label={t('free.listings')}
            type="number"
            hint={t('free.listingsHint')}
            value={free.listings}
            onChange={(e) => setFree({ ...free, listings: e.target.value })}
          />
          <Field
            id="free-bumps"
            label={t('free.bumps')}
            type="number"
            value={free.bumps}
            onChange={(e) => setFree({ ...free, bumps: e.target.value })}
          />
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">{t('prices.title')}</h2>
        <Table columns={extraColumns} rows={pricing.extras} />
        <p className="text-small text-ink-muted">{t('prices.note')}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">{t('pins.title')}</h2>
        <Table columns={pinColumns} rows={pricing.pins} />
        <p className="text-small text-ink-muted">{t('pins.note')}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">{t('earned.title')}</h2>
        <BarList rows={platformRevenue.sources.map((s) => ({ label: s.name, value: s.amount }))} format={vnd} />
        <p className="text-small text-ink-muted">{t('earned.note')}</p>
      </section>

      <p className="text-ink-muted text-[13px]">
        {t('lastChanged', { date: pricing.lastChanged, by: pricing.changedBy })}
      </p>

      <Dialog
        open={adjustOpen}
        title={t('adjust.title')}
        onClose={() => setAdjustOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setAdjustOpen(false)}>
              {t('adjust.cancel')}
            </Button>
            <Button
              onClick={() => {
                Notification.success({ text: t('toast.adjusted', { pct: adjust.pct }) });
                setAdjustOpen(false);
              }}
            >
              {t('adjust.confirm')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{t('adjust.text')}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="adjust-pct"
              label={t('adjust.changeBy')}
              type="number"
              step={0.5}
              hint={t('adjust.changeByHint')}
              value={adjust.pct}
              onChange={(e) => setAdjust({ ...adjust, pct: e.target.value })}
            />
            <SelectField
              id="adjust-when"
              label={t('adjust.when')}
              value={adjust.when}
              onChange={(e) => setAdjust({ ...adjust, when: e.target.value })}
              options={[
                { value: 'notice', label: t('adjust.whenNotice') },
                { value: 'nextMonth', label: t('adjust.whenNextMonth') },
              ]}
            />
          </div>
          <p className="text-small text-ink-muted">{t('adjust.example', { from: vnd(15000), to: vnd(16000) })}</p>
        </div>
      </Dialog>
    </div>
  );
};

export default AdminPricingPage;
