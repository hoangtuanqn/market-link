import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import StallApi, { type SlotDto, type StallMarketDto } from '@/api-requests/stall.requests';
import DayChips from '@/components/DayChips';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import useRequest from '@/hooks/useRequest';
import { dayList, dayName, formatClock, formatDayMonth, formatTime } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const NO_MARKETS: StallMarketDto[] = [];
/** How far ahead the day picker looks for a day that matches this market's operating days. */
const DAYS_AHEAD = 14;
/** The Generate dialog defaults to a 2-week range, same as the manual check in the task brief. */
const GEN_RANGE_DAYS = 14;

const pad = (n: number) => String(n).padStart(2, '0');
/** Local date → "yyyy-MM-dd", the wire format for `date`, `fromDate` and `toDate`. */
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** "yyyy-MM-dd" → a Date in local time (a UTC parse would land on the wrong day at UTC-x). */
const localDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};

/** The next `DAYS_AHEAD` days that fall on one of this market's operating weekdays. */
const buildDayOptions = (operatingDays: StallMarketDto['operatingDays']) => {
  const allowed = new Set(operatingDays.map((d) => d.dayOfWeek));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const options: { value: string; date: Date }[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = addDays(today, i);
    if (allowed.has(date.getDay())) options.push({ value: isoDate(date), date });
  }
  return options;
};

/** "06:00–06:30" from the DTO's own 24-hour fields, in the reader's clock. */
const clockRange = (s: SlotDto) => `${formatClock(s.startTime)}–${formatClock(s.endTime)}`;

/** The slot's start as a real Date, from its `slotDate` + `startTime`. */
const slotStart = (s: SlotDto) => {
  const [h, m] = s.startTime.split(':').map(Number);
  const d = localDay(s.slotDate);
  d.setHours(h, m, 0, 0);
  return d;
};

/** When changes to this slot stop being accepted: its start minus the stall's order cutoff. */
const closesAt = (s: SlotDto, cutoffHours: number) => new Date(slotStart(s).getTime() - cutoffHours * 3_600_000);

/**
 * FR-032 FR-067 — pickup slots for one market day. The list comes from the public slots endpoint (same one customers
 * use), which only ever returns active slots; turning a slot off therefore drops it out of this table too. Calling
 * Generate again does not flip it back on (checked against the live API), and there is no farmer endpoint that lists
 * inactive slots either, so once a slot is off this screen has no way to show it or turn it back on — see
 * `table.reenableNote` (proposed to LEAD: a farmer-only slots list that includes inactive rows, docs/api-contract.md §6
 * handoff). Cancelling a whole market day ("away days") has no farmer-facing API and is not in the SRS, so it is not
 * part of this screen either.
 */
const FarmerSlotsPage = () => {
  const { t } = useTranslation('FarmerSlots');
  const { t: tc } = useTranslation();

  const { state: profileLoad, retry: retryProfile } = useRequest('farmer-slots-profile', () => StallApi.myProfile());
  const profile = profileLoad.kind === 'ready' ? profileLoad.data : null;
  const markets = profile?.markets ?? NO_MARKETS;

  const [marketId, setMarketId] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const activeMarket = markets.find((m) => m.marketId === (marketId ?? markets[0]?.marketId)) ?? null;
  const dayOptions = activeMarket ? buildDayOptions(activeMarket.operatingDays) : [];
  const activeDate = date ?? dayOptions[0]?.value ?? null;
  const activeDay = dayOptions.find((d) => d.value === activeDate) ?? null;

  const {
    state: slotsLoad,
    retry: retrySlots,
    mutate: mutateSlots,
  } = useRequest(`slots:${activeMarket?.marketId ?? 'none'}:${activeDate ?? 'none'}`, () =>
    profile && activeMarket && activeDate
      ? StallApi.slots(profile.farmerId, { marketId: activeMarket.marketId, date: activeDate })
      : Promise.resolve([]),
  );
  const slots = slotsLoad.kind === 'ready' ? slotsLoad.data : [];

  const [savingMax, setSavingMax] = useState<number | null>(null);
  // Bumped after every save attempt (success or not) so the input's `key` changes and it remounts from the latest
  // committed value — the plain way to revert a failed edit without controlled state fighting the user's typing.
  const [maxAttempt, setMaxAttempt] = useState<Record<number, number>>({});
  const [closingId, setClosingId] = useState<number | null>(null);

  const [genOpen, setGenOpen] = useState(false);
  const [genFrom, setGenFrom] = useState(() => isoDate(new Date()));
  const [genTo, setGenTo] = useState(() => isoDate(addDays(new Date(), GEN_RANGE_DAYS - 1)));
  const [genMinutes, setGenMinutes] = useState('30');
  const [genMax, setGenMax] = useState('5');
  const [generating, setGenerating] = useState(false);

  if (profileLoad.kind === 'loading') {
    return (
      <p role="status" className="text-ink-muted">
        {tc('notify.list.loading')}
      </p>
    );
  }
  if (profileLoad.kind === 'error' || !profile) {
    return <LoadError noun={t('error.noun')} onRetry={retryProfile} />;
  }

  const bumpAttempt = (slotId: number) => setMaxAttempt((prev) => ({ ...prev, [slotId]: (prev[slotId] ?? 0) + 1 }));

  const saveMax = async (slot: SlotDto, raw: string) => {
    const parsed = Number(raw);
    // The server also rejects maxOrders below 1 (VALIDATION_ERROR) regardless of bookedCount.
    const next = Number.isFinite(parsed) ? Math.max(slot.bookedCount, 1, Math.trunc(parsed)) : slot.maxOrders;
    if (next === slot.maxOrders) return;
    setSavingMax(slot.slotId);
    try {
      const updated = await StallApi.updateSlot(slot.slotId, { maxOrders: next });
      mutateSlots((rows) => rows.map((r) => (r.slotId === slot.slotId ? updated : r)));
    } catch (error) {
      const code = Helper.getErrorCode(error);
      Notification.error({
        text:
          code === 'SLOT_BELOW_BOOKED' ? t('table.belowBooked') : Helper.getErrorMessage(error, tc('errors.network')),
      });
    } finally {
      setSavingMax(null);
      bumpAttempt(slot.slotId);
    }
  };

  const closeSlot = async (slot: SlotDto) => {
    setClosingId(slot.slotId);
    try {
      await StallApi.updateSlot(slot.slotId, { isActive: false });
      mutateSlots((rows) => rows.filter((r) => r.slotId !== slot.slotId));
      Notification.success({ title: t('table.closedTitle'), text: t('table.closedText') });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setClosingId(null);
    }
  };

  const generate = async () => {
    if (!activeMarket) return;
    if (!genFrom || !genTo || genTo < genFrom) {
      Notification.error({ text: t('generate.rangeError') });
      return;
    }
    setGenerating(true);
    try {
      const created = await StallApi.generateSlots({
        farmerMarketId: activeMarket.farmerMarketId,
        fromDate: genFrom,
        toDate: genTo,
        slotMinutes: Number(genMinutes) || 30,
        maxOrders: Number(genMax) || 1,
      });
      setGenOpen(false);
      retrySlots();
      Notification.success({
        title: t('generate.doneTitle'),
        text: t('generate.doneText', {
          count: created.length,
          from: formatDayMonth(localDay(genFrom)),
          to: formatDayMonth(localDay(genTo)),
        }),
      });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setGenerating(false);
    }
  };

  const columns: TableColumn<SlotDto>[] = [
    { key: 't', label: t('table.slot'), render: (s) => <b className="tabular-nums">{clockRange(s)}</b> },
    {
      key: 'b',
      label: t('table.booked'),
      align: 'num',
      render: (s) => (
        <>
          {t('table.bookedOf', { booked: s.bookedCount, max: s.maxOrders })}
          {s.isFull && <span className="text-ink-muted ml-1 font-normal">{t('table.full')}</span>}
        </>
      ),
    },
    {
      key: 'm',
      label: t('table.max'),
      align: 'num',
      render: (s) => (
        <input
          key={`${s.slotId}:${s.maxOrders}:${maxAttempt[s.slotId] ?? 0}`}
          type="number"
          min={Math.max(s.bookedCount, 1)}
          defaultValue={s.maxOrders}
          disabled={savingMax === s.slotId}
          onBlur={(e) => void saveMax(s, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          aria-label={t('table.maxFor', { slot: clockRange(s) })}
          className="border-line-strong bg-surface-raised min-h-9 w-21 rounded-sm border-[1.5px] px-2 text-right tabular-nums disabled:opacity-60"
        />
      ),
    },
    {
      key: 'c',
      label: t('table.closes'),
      render: (s) => {
        const closes = closesAt(s, profile.orderCutoffHours);
        return `${formatTime(closes)} ${formatDayMonth(closes)}`;
      },
    },
    {
      key: 'o',
      label: t('table.open'),
      render: (s) => (
        <Checkbox
          id={`open-${s.slotId}`}
          checked
          disabled={closingId === s.slotId}
          onChange={(e) => {
            if (!e.target.checked) void closeSlot(s);
          }}
        >
          {t('table.on')}
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
        <Button onClick={() => setGenOpen(true)} disabled={!activeMarket}>
          {t('generate.open')}
        </Button>
      </div>

      {markets.length === 0 ? (
        <DataState
          title={t('noMarkets.title')}
          text={t('noMarkets.text')}
          action={<ButtonLink to="/farmer/stall">{t('crumbStall')}</ButtonLink>}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-6">
            <SelectField
              id="mk"
              label={t('market')}
              value={String(activeMarket?.marketId ?? '')}
              onChange={(e) => {
                setMarketId(Number(e.target.value));
                setDate(null);
              }}
              options={markets.map((m) => ({ value: String(m.marketId), label: m.marketName }))}
            />
            {dayOptions.length > 0 && (
              <DayChips
                legend={t('day')}
                name="slot-day"
                options={dayOptions.map((d) => ({
                  value: d.value,
                  label: dayName(d.date.getDay(), 'long'),
                  date: formatDayMonth(d.date),
                }))}
                value={activeDate ?? ''}
                onChange={setDate}
              />
            )}
          </div>

          {dayOptions.length === 0 ? (
            <DataState
              title={t('noDays.title')}
              text={t('noDays.text')}
              action={<ButtonLink to="/farmer/stall">{t('crumbStall')}</ButtonLink>}
            />
          ) : slotsLoad.kind === 'loading' ? (
            <p role="status" className="text-ink-muted">
              {tc('notify.list.loading')}
            </p>
          ) : slotsLoad.kind === 'error' ? (
            <LoadError noun={t('error.slotsNoun')} onRetry={retrySlots} />
          ) : slots.length ? (
            <>
              <Table
                caption={t('table.caption', {
                  count: slots.length,
                  day: activeDay ? dayName(activeDay.date.getDay(), 'long') : '',
                  date: activeDay ? formatDayMonth(activeDay.date) : '',
                  market: activeMarket?.marketName ?? '',
                })}
                columns={columns}
                rows={slots}
              />
              <p className="text-small text-ink-muted">
                <Trans
                  t={t}
                  i18nKey="table.reenableNote"
                  components={{ a: <Link to="/contact" className="text-brand underline" /> }}
                />
              </p>
            </>
          ) : (
            <DataState title={t('empty.title')} text={t('empty.text')} />
          )}
        </>
      )}

      {activeMarket && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('defaults.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              {activeMarket.operatingDays.length > 0 && (
                <>
                  <dt className="text-ink-muted">{t('defaults.windowAt', { market: activeMarket.marketName })}</dt>
                  <dd className="m-0">
                    {t('defaults.window', {
                      start: formatClock(activeMarket.operatingDays[0].pickupStartTime),
                      end: formatClock(activeMarket.operatingDays[0].pickupEndTime),
                      days: dayList(activeMarket.operatingDays.map((d) => d.dayOfWeek)),
                    })}
                  </dd>
                </>
              )}
              <dt className="text-ink-muted">{t('defaults.cutoff')}</dt>
              <dd className="m-0">{t('defaults.cutoffValue', { count: profile.orderCutoffHours })}</dd>
            </dl>
            <p className="text-small text-ink-muted">{t('defaults.note')}</p>
          </Card>
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('closing.title')}</h2>
            <p className="text-[15px]">{t('closing.text')}</p>
          </Card>
        </div>
      )}

      {activeMarket && (
        <Dialog
          open={genOpen}
          title={t('generate.title', { market: activeMarket.marketName })}
          onClose={() => setGenOpen(false)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setGenOpen(false)} disabled={generating}>
                {t('cancel')}
              </Button>
              <Button onClick={() => void generate()} disabled={generating}>
                {t('generate.confirm')}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="genFrom"
                type="date"
                label={t('generate.from')}
                value={genFrom}
                onChange={(e) => setGenFrom(e.target.value)}
              />
              <Field
                id="genTo"
                type="date"
                label={t('generate.to')}
                value={genTo}
                onChange={(e) => setGenTo(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                id="len"
                label={t('defaults.length')}
                value={genMinutes}
                onChange={(e) => setGenMinutes(e.target.value)}
                options={[30, 15, 60].map((n) => ({ value: String(n), label: t('minutes', { count: n }) }))}
              />
              <Field
                id="mx"
                label={t('defaults.perSlot')}
                inputMode="numeric"
                value={genMax}
                onChange={(e) => setGenMax(e.target.value)}
              />
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default FarmerSlotsPage;
