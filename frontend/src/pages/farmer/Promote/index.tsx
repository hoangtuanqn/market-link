import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@/components/icons';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, type TableColumn } from '@/components/ui/table';
import { product } from '@/data/catalog';
import { nowLabel, vnd } from '@/lib/format';
import Notification from '@/utils/notification';

const PIN_PRODUCT_IDS = [1, 2, 7, 19];

/** Bundle lines: `bundleLine.<kind>` in FarmerPromote.json, with the number as `count`. */
type BundleLine = { kind: 'listings' | 'bumps' | 'pinDays' | 'runs' | 'noLimit' | 'bumpsTotal'; count?: number };

/** Names, notes and lines are keys in FarmerPromote.json (`extras.<key>`, `pin.<key>.*`, `bundle.<key>`). */
const PRICING = {
  free: { listingsPerDay: 5, bumpsPerMonth: 10 },
  extras: [
    { key: 'listing', price: 2000 },
    { key: 'bump', price: 3000 },
  ] as { key: 'listing' | 'bump'; price: number }[],
  pins: [
    {
      key: 'market' as const,
      slots: 3,
      days: [
        [1, 15000],
        [3, 35000],
        [7, 70000],
      ] as [number, number][],
    },
    {
      key: 'home' as const,
      slots: 2,
      days: [
        [1, 40000],
        [3, 100000],
        [7, 200000],
      ] as [number, number][],
    },
  ],
  bundles: [
    {
      key: 'starter',
      price: 50000,
      lines: [
        { kind: 'listings', count: 30 },
        { kind: 'bumps', count: 10 },
        { kind: 'runs', count: 30 },
      ],
    },
    {
      key: 'market',
      price: 150000,
      best: true,
      lines: [
        { kind: 'listings', count: 100 },
        { kind: 'bumps', count: 40 },
        { kind: 'pinDays', count: 2 },
        { kind: 'runs', count: 30 },
      ],
    },
    {
      key: 'season',
      price: 400000,
      lines: [
        { kind: 'noLimit' },
        { kind: 'bumpsTotal', count: 120 },
        { kind: 'pinDays', count: 7 },
        { kind: 'runs', count: 30 },
      ],
    },
  ] as { key: 'starter' | 'market' | 'season'; price: number; best?: boolean; lines: BundleLine[] }[],
};

/** What Cô Tư Garden has used this period. */
const ALLOWANCE = {
  listingsUsed: 3,
  bumpsUsed: 7,
  credits: 24000,
  pins: [
    {
      productId: 1,
      where: 'Thảo Điền Weekend Market',
      until: new Date(2026, 8, 26, 23, 59),
      spent: 35000,
      views: 412,
      added: 9,
    },
  ],
};

type ActivePin = (typeof ALLOWANCE.pins)[number];

const Meter = ({ used, total, kind }: { used: number; total: number; kind: 'listings' | 'bumps' }) => {
  const { t } = useTranslation('FarmerPromote');
  const pct = Math.min(100, Math.round((used / total) * 100));
  const level = pct >= 100 ? 'full' : pct >= 70 ? 'warn' : 'ok';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-3">
        <b className="font-hand text-[48px] leading-none tabular-nums">{total - used}</b>
        <span className="text-small text-ink-muted">{t(`meter.left.${kind}`, { count: total })}</span>
      </div>
      <div className="bg-surface-sunken relative h-2.5 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_var(--line)]">
        <span
          className={
            level === 'ok'
              ? 'bg-brand absolute inset-y-0 left-0 rounded-full'
              : level === 'warn'
                ? 'bg-warning-ink absolute inset-y-0 left-0 rounded-full'
                : 'bg-danger absolute inset-y-0 left-0 rounded-full'
          }
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-ink-muted text-[13px]">
        {t('meter.used', { used })}
        {pct >= 70 ? ` · ${t('meter.low')}` : ''}
      </span>
    </div>
  );
};

const PinCard = ({ pin }: { pin: (typeof PRICING.pins)[number] }) => {
  const { t } = useTranslation('FarmerPromote');
  const [dayIndex, setDayIndex] = useState(1);
  const [productId, setProductId] = useState(PIN_PRODUCT_IDS[0]);
  const price = pin.days[dayIndex][1];

  return (
    <Card className="flex flex-col gap-3 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-h3">{t(`pin.${pin.key}.name`)}</h3>
        <span className="text-small text-ink-muted">{t('pin.slots', { count: pin.slots })}</span>
      </div>
      <p className="text-small text-ink-muted">{t(`pin.${pin.key}.note`)}</p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`p-${pin.key}`} className="text-small font-bold">
          {t('pin.product')}
        </label>
        <select
          id={`p-${pin.key}`}
          value={productId}
          onChange={(e) => setProductId(Number(e.target.value))}
          className="border-line-strong bg-surface-raised min-h-11 rounded-sm border-[1.5px] px-3"
        >
          {PIN_PRODUCT_IDS.map((id) => (
            <option key={id} value={id}>
              {product(id)?.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="text-small mb-1 p-0 font-bold">{t('pin.duration')}</legend>
        <div className="flex flex-wrap gap-2">
          {pin.days.map(([days, cost], i) => (
            <label key={days} className="relative">
              <input
                type="radio"
                name={`d-${pin.key}`}
                checked={dayIndex === i}
                onChange={() => setDayIndex(i)}
                className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
              />
              <span className="border-line-strong bg-surface-raised peer-checked:bg-brand peer-checked:text-on-brand peer-focus-visible:outline-focus flex min-h-14 min-w-20 flex-col items-center justify-center gap-0.5 rounded-sm px-3 py-1.5 text-[14px] leading-tight font-bold shadow-[inset_0_0_0_1.5px_var(--line-strong)] peer-checked:shadow-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                {t('pin.days', { count: days })}
                <small className="font-normal text-inherit opacity-80">{vnd(cost)}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Button
        onClick={() =>
          Notification.success({
            title: t('toast.pinnedTitle'),
            text: t('toast.pinnedText'),
          })
        }
      >
        {t('pin.cta', { price: vnd(price) })}
      </Button>
    </Card>
  );
};

/** Proposal, not in the SRS — paid promotion and listing allowance (see the warning banner below). */
const FarmerPromotePage = () => {
  const { t, i18n } = useTranslation('FarmerPromote');
  const num = (n: number) => new Intl.NumberFormat(i18n.language).format(n);
  const activeColumns: TableColumn<ActivePin>[] = [
    {
      key: 'p',
      label: t('col.product'),
      render: (r) => (
        <>
          <b>{product(r.productId)?.name}</b>
          <span className="text-ink-muted mt-0.5 block text-[13px] font-normal">{r.where}</span>
        </>
      ),
    },
    { key: 'u', label: t('col.until'), render: (r) => nowLabel(r.until) },
    { key: 'v', label: t('col.views'), align: 'num', render: (r) => num(r.views) },
    { key: 'a', label: t('col.added'), align: 'num', render: (r) => num(r.added) },
    { key: 's', label: t('col.paid'), align: 'num', render: (r) => vnd(r.spent) },
    {
      key: 'x',
      label: '',
      align: 'actions',
      render: () => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            Notification.success({
              title: t('toast.extendedTitle'),
              text: t('toast.extendedText', { count: 3, price: vnd(35000) }),
            })
          }
        >
          {t('action.extend')}
        </Button>
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-status-ready-bg text-status-ready-ink inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-2.5 text-[13px] font-bold">
            <CheckIcon size={14} />
            {t('credit', { amount: vnd(ALLOWANCE.credits) })}
          </span>
          <Button
            variant="secondary"
            onClick={() =>
              Notification.success({
                title: t('toast.topUpTitle'),
                text: t('toast.topUpText'),
              })
            }
          >
            {t('action.topUp')}
          </Button>
        </div>
      </div>

      <Banner variant="warning" title={t('srs.title')}>
        {t('srs.text')}
      </Banner>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">{t('listings.title')}</h2>
          <Meter used={ALLOWANCE.listingsUsed} total={PRICING.free.listingsPerDay} kind="listings" />
          <p className="text-small text-ink-muted">{t('listings.text')}</p>
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">{t('bumps.title')}</h2>
          <Meter used={ALLOWANCE.bumpsUsed} total={PRICING.free.bumpsPerMonth} kind="bumps" />
          <p className="text-small text-ink-muted">{t('bumps.text')}</p>
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h2">{t('pinned.title')}</h2>
          <span className="text-small text-ink-muted">{t('pinned.hint')}</span>
        </div>
        <Table columns={activeColumns} rows={ALLOWANCE.pins} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">{t('pinSection.title')}</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {PRICING.pins.map((pin) => (
            <PinCard key={pin.key} pin={pin} />
          ))}
        </div>
        <p className="text-small text-ink-muted">{t('pinSection.note')}</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">{t('bundles.title')}</h2>
        <p className="text-small text-ink-muted -mt-2">{t('bundles.intro', { days: 30 })}</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {PRICING.bundles.map((b) => (
            <Card
              key={b.key}
              className={
                b.best ? 'flex flex-col gap-2 p-4 shadow-[inset_0_0_0_2px_var(--brand)]' : 'flex flex-col gap-2 p-4'
              }
            >
              <h3 className="m-0 text-[17px] font-bold">{t(`bundle.${b.key}`)}</h3>
              <span className="font-hand text-[34px] leading-[1.05]">{vnd(b.price)}</span>
              <ul className="m-0 flex flex-col gap-1.5 p-0 text-[14px]">
                {b.lines.map((l) => (
                  <li key={l.kind} className="flex items-start gap-2">
                    <CheckIcon size={16} className="text-brand mt-0.75 flex-none" />
                    {t(`bundleLine.${l.kind}`, { count: l.count ?? 0 })}
                  </li>
                ))}
              </ul>
              <Button
                variant={b.best ? 'primary' : 'secondary'}
                className="mt-auto"
                onClick={() =>
                  Notification.success({
                    title: t('toast.bundleTitle'),
                    text: t('toast.bundleText', { name: t(`bundle.${b.key}`) }),
                  })
                }
              >
                {t('bundles.choose', { name: t(`bundle.${b.key}`) })}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">{t('extrasSection.title')}</h2>
        <Table
          columns={[
            {
              key: 'n',
              label: t('col.what'),
              render: (r: (typeof PRICING.extras)[number]) => t(`extras.${r.key}`),
            },
            { key: 'p', label: t('col.price'), align: 'num', render: (r) => vnd(r.price) },
            {
              key: 'a',
              label: '',
              align: 'actions',
              render: () => (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => Notification.success({ title: t('toast.addedTitle'), text: t('toast.addedText') })}
                >
                  {t('action.buy')}
                </Button>
              ),
            },
          ]}
          rows={PRICING.extras}
        />
      </section>
    </div>
  );
};

export default FarmerPromotePage;
