import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import DayChips from '@/components/DayChips';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import { farmer, marketName } from '@/data/catalog';
import { dayList, dayName, formatClock, formatDate, formatDayMonth, weekday } from '@/lib/format';
import Notification from '@/utils/notification';

const f = farmer(1)!;

type Slot = { value: string; time: string; booked: number; max: number; off?: boolean };

const INITIAL_SLOTS: Slot[] = [
  { value: '0600', time: '06:00–06:30', booked: 5, max: 5 },
  { value: '0630', time: '06:30–07:00', booked: 3, max: 5 },
  { value: '0700', time: '07:00–07:30', booked: 1, max: 5 },
  { value: '0730', time: '07:30–08:00', booked: 0, max: 5 },
  { value: '0800', time: '08:00–08:30', booked: 0, max: 5 },
  { value: '0830', time: '08:30–09:00', booked: 2, max: 5 },
  { value: '0900', time: '09:00–09:30', booked: 0, max: 5 },
  { value: '0930', time: '09:30–10:00', booked: 1, max: 5 },
  { value: '1000', time: '10:00–10:30', booked: 0, max: 3, off: true },
];

/** "06:00–06:30" (stored 24-hour) → the reader's clock. */
const clockRange = (range: string) => range.split('–').map(formatClock).join('–');

const DAY_OPTIONS = [
  { value: 'sat', date: new Date(2026, 8, 26) },
  { value: 'sun', date: new Date(2026, 8, 27) },
  { value: 'sat2', date: new Date(2026, 9, 3) },
  { value: 'sun2', date: new Date(2026, 9, 4), disabled: true },
];

/** `reason` is what the farmer typed; `reasonKey` is a page string (the seeded example, or "not given"). */
type DayOff = {
  id: number;
  marketId: number;
  date: Date;
  reason?: string;
  reasonKey?: 'away.seedReason' | 'away.notGiven';
  orders: number;
};

/** The market days a farmer can step away from; `note` picks the hint shown after the date. */
const AWAY_OPTIONS = [
  { value: '2026-09-27', date: new Date(2026, 8, 27), orders: 2, note: 'placed' },
  { value: '2026-10-03', date: new Date(2026, 9, 3), orders: 0, note: 'none' },
  { value: '2026-10-04', date: new Date(2026, 9, 4), orders: 0, note: 'shut' },
] as const;

/** The one market closure that touches this farmer's markets (04/10 at Thảo Điền, called by the admin). */
const MARKET_CLOSURE = { date: new Date(2026, 9, 4), reason: 'Ward street works on Quốc Hương' };
const GEN_FROM = new Date(2026, 9, 3);
const GEN_TO = new Date(2026, 9, 4);

/** FR-032 FR-067 — pickup slots for one market day, and the days this stall is not attending. */
const FarmerSlotsPage = () => {
  const { t } = useTranslation('FarmerSlots');
  const [market, setMarket] = useState(marketName(1));
  const [day, setDay] = useState('sat');
  const [slots, setSlots] = useState<Slot[]>(INITIAL_SLOTS);
  const [genOpen, setGenOpen] = useState(false);
  const [away, setAway] = useState<DayOff[]>([
    {
      id: 1,
      marketId: 1,
      date: new Date(2026, 8, 27),
      reasonKey: 'away.seedReason',
      orders: 2,
    },
  ]);
  const [awayOpen, setAwayOpen] = useState(false);
  const [awayChoice, setAwayChoice] = useState<string>(AWAY_OPTIONS[0].value);
  const [awayReason, setAwayReason] = useState('');

  const updateSlot = (value: string, patch: Partial<Slot>) =>
    setSlots((prev) => prev.map((s) => (s.value === value ? { ...s, ...patch } : s)));

  const columns: TableColumn<Slot>[] = [
    { key: 't', label: t('table.slot'), render: (s) => <b className="tabular-nums">{clockRange(s.time)}</b> },
    {
      key: 'b',
      label: t('table.booked'),
      align: 'num',
      render: (s) => (
        <>
          {t('table.bookedOf', { booked: s.booked, max: s.max })}
          {s.booked >= s.max && <span className="text-ink-muted ml-1 font-normal">{t('table.full')}</span>}
        </>
      ),
    },
    {
      key: 'm',
      label: t('table.max'),
      align: 'num',
      render: (s) => (
        <input
          type="number"
          min={s.booked}
          value={s.max}
          onChange={(e) => updateSlot(s.value, { max: Math.max(s.booked, Number(e.target.value) || s.booked) })}
          aria-label={t('table.maxFor', { slot: clockRange(s.time) })}
          className="border-line-strong bg-surface-raised min-h-9 w-21 rounded-sm border-[1.5px] px-2 text-right tabular-nums"
        />
      ),
    },
    {
      key: 'c',
      label: t('table.closes'),
      render: () => `${formatClock('19:00')} ${formatDayMonth(new Date(2026, 8, 25))}`,
    },
    {
      key: 'o',
      label: t('table.open'),
      render: (s) => (
        <Checkbox
          id={`open-${s.value}`}
          checked={!s.off}
          onChange={(e) => updateSlot(s.value, { off: !e.target.checked })}
        >
          {s.off ? t('table.off') : t('table.on')}
        </Checkbox>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/farmer/stall" className="text-brand underline">
          {t('crumbStall')}
        </Link>{' '}
        · {t('title')}
      </p>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        <Button onClick={() => setGenOpen(true)}>{t('generate.open')}</Button>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <SelectField
          id="mk"
          label={t('market')}
          value={market}
          onChange={(e) => setMarket(e.target.value)}
          options={[marketName(1), marketName(2)]}
        />
        <DayChips
          legend={t('day')}
          name="slot-day"
          options={DAY_OPTIONS.map((d) => ({
            value: d.value,
            label: weekday(d.date),
            sub: formatDayMonth(d.date),
            disabled: d.disabled,
          }))}
          value={day}
          onChange={setDay}
        />
      </div>

      {slots.length ? (
        <Table
          caption={t('table.caption', {
            count: slots.length,
            day: dayName(6, 'long'),
            date: formatDayMonth(new Date(2026, 8, 26)),
            market: marketName(1),
          })}
          columns={columns}
          rows={slots}
        />
      ) : (
        <DataState title={t('empty.title')} text={t('empty.text')} />
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">{t('defaults.title')}</h2>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="text-ink-muted">{t('defaults.length')}</dt>
            <dd className="m-0">{t('minutes', { count: 30 })}</dd>
            <dt className="text-ink-muted">{t('defaults.perSlot')}</dt>
            <dd className="m-0">5 (D-06)</dd>
            <dt className="text-ink-muted">{t('defaults.windowAt', { market: 'Thảo Điền' })}</dt>
            <dd className="m-0">
              {t('defaults.window', { start: formatClock('06:00'), end: formatClock('10:30'), days: dayList([6, 0]) })}
            </dd>
            <dt className="text-ink-muted">{t('defaults.cutoff')}</dt>
            <dd className="m-0">{t('defaults.cutoffValue', { count: f.cutoffHours })}</dd>
          </dl>
          <p className="text-small text-ink-muted">{t('defaults.note')}</p>
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">{t('closing.title')}</h2>
          <p className="text-[15px]">{t('closing.text')}</p>
        </Card>
      </div>

      <section className="border-line-strong bg-surface-raised shadow-tag flex flex-col gap-4 rounded-md border-[1.5px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-160 flex-col gap-2">
            <h2 className="text-h3">{t('away.title')}</h2>
            <p className="text-small text-ink-muted">{t('away.intro')}</p>
          </div>
          <Button variant="secondary" onClick={() => setAwayOpen(true)}>
            {t('away.open')}
          </Button>
        </div>

        {away.length ? (
          <Table
            columns={[
              {
                key: 'd',
                label: t('away.date'),
                render: (d: DayOff) => (
                  <>
                    <b>{formatDate(d.date)}</b>
                    <span className="text-ink-muted mt-0.5 block text-[13px] font-normal">
                      {dayName(d.date.getDay(), 'long')}
                    </span>
                  </>
                ),
              },
              { key: 'm', label: t('market'), render: () => marketName(1) },
              {
                key: 'r',
                label: t('away.reasonSeen'),
                render: (d: DayOff) => d.reason ?? (d.reasonKey ? t(d.reasonKey) : ''),
              },
              { key: 'o', label: t('away.declined'), align: 'num', render: (d: DayOff) => d.orders || '—' },
              {
                key: 'a',
                label: '',
                align: 'actions',
                render: (d: DayOff) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setAway((prev) => prev.filter((x) => x.id !== d.id));
                      Notification.success({
                        title: t('away.backTitle'),
                        text: t('away.backText'),
                      });
                    }}
                  >
                    {t('away.back')}
                  </Button>
                ),
              },
            ]}
            rows={away}
          />
        ) : (
          <DataState title={t('away.emptyTitle')} text={t('away.emptyText')} />
        )}

        <Banner variant="info" title={t('closure.title', { date: formatDate(MARKET_CLOSURE.date) })}>
          {t('closure.text', { reason: MARKET_CLOSURE.reason })}
        </Banner>
      </section>

      <Dialog
        open={genOpen}
        title={t('generate.title', { from: formatDayMonth(GEN_FROM), to: formatDayMonth(GEN_TO) })}
        onClose={() => setGenOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setGenOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={() => {
                setGenOpen(false);
                Notification.success({
                  title: t('generate.doneTitle'),
                  text: t('generate.doneText', {
                    count: 27,
                    from: formatDayMonth(GEN_FROM),
                    to: formatDayMonth(GEN_TO),
                  }),
                });
              }}
            >
              {t('generate.confirm', { count: 27 })}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              id="len"
              label={t('defaults.length')}
              options={[30, 15, 60].map((n) => ({ value: String(n), label: t('minutes', { count: n }) }))}
            />
            <Field id="mx" label={t('defaults.perSlot')} inputMode="numeric" defaultValue={5} />
          </div>
          <p className="text-ink-muted text-[14px]">
            {t('generate.text', {
              start: formatClock('06:00'),
              end: formatClock('10:30'),
              daysA: dayList([6, 0]),
              daysB: dayList([0]),
            })}
          </p>
        </div>
      </Dialog>

      <Dialog
        open={awayOpen}
        title={t('away.open')}
        tone="danger"
        onClose={() => setAwayOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setAwayOpen(false)}>
              {t('away.notNow')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const choice = AWAY_OPTIONS.find((o) => o.value === awayChoice) ?? AWAY_OPTIONS[0];
                const { date, orders } = choice;
                const typed = awayReason.trim();
                setAway((prev) => [
                  ...prev,
                  {
                    id: Date.now(),
                    marketId: 1,
                    date,
                    reason: typed || undefined,
                    reasonKey: typed ? undefined : 'away.notGiven',
                    orders,
                  },
                ]);
                setAwayOpen(false);
                setAwayReason('');
                Notification.success({
                  title: orders ? t('away.declinedTitle') : t('away.toldTitle'),
                  text: orders
                    ? t('away.declinedText', { count: orders })
                    : t('away.toldText', { date: formatDate(date) }),
                });
              }}
            >
              {t('away.confirm')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[15px]">{t('away.dialogText')}</p>
          <SelectField
            id="odate"
            label={t('away.marketDay')}
            value={awayChoice}
            onChange={(e) => setAwayChoice(e.target.value)}
            options={AWAY_OPTIONS.map((o) => ({
              value: o.value,
              label: [
                `${weekday(o.date)} ${formatDayMonth(o.date)}`,
                'Thảo Điền',
                t(`away.note.${o.note}`, { count: o.orders }),
              ].join(' · '),
            }))}
          />
          <Field
            id="oreason"
            label={t('away.reasonLabel')}
            placeholder={t('away.seedReason')}
            value={awayReason}
            onChange={(e) => setAwayReason(e.target.value)}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default FarmerSlotsPage;
