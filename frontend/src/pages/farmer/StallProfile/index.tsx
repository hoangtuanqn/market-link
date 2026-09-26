import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import CatalogApi from '@/api-requests/catalog.requests';
import StallApi, { type StallDetailDto, type StallMarketDto } from '@/api-requests/stall.requests';
import LocationPicker from '@/components/LocationPicker';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadError } from '@/components/ui/data-state';
import { Field } from '@/components/ui/input';
import Tabs from '@/components/ui/tabs';
import useRequest from '@/hooks/useRequest';
import useSession from '@/hooks/useSession';
import { dayList, dayName, formatClock } from '@/lib/format';
import type { MarketType } from '@/types/market.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

/** Contract §3 caps a page at 50; every market of the city fits in one call. */
const FETCH_SIZE = 50;
const NO_MARKETS: MarketType[] = [];
/** D-05: the server accepts 1…72 hours; the same rule here so nobody waits on a round trip to learn it. */
const CUTOFF_MIN = 1;
const CUTOFF_MAX = 72;

type StallForm = { stallName: string; person: string; about: string; cutoffHours: number };
type FormErrors = Partial<Record<'stall' | 'person' | 'cut', string>>;
type MarketSettings = { code: string; days: number[]; start: string; end: string; lat: number; lng: number };

/** Contract §4 field names → this form's field ids. */
const SERVER_FIELDS: Record<string, keyof FormErrors> = {
  stallName: 'stall',
  contactPerson: 'person',
  orderCutoffHours: 'cut',
};

const formFrom = (s: StallDetailDto): StallForm => ({
  stallName: s.stallName,
  person: s.contactPerson,
  about: s.description ?? '',
  cutoffHours: s.orderCutoffHours,
});

/** What the stall has saved at a market; the market's own hours and pin fill the gaps for a fresh one. */
const settingsFrom = (sm: StallMarketDto, market: MarketType | undefined): MarketSettings => ({
  code: sm.stallCode ?? '',
  days: sm.operatingDays.map((d) => d.dayOfWeek),
  start: sm.operatingDays[0]?.pickupStartTime ?? market?.open ?? '06:00',
  end: sm.operatingDays[0]?.pickupEndTime ?? market?.close ?? '10:00',
  lat: sm.stallLatitude != null ? Number(sm.stallLatitude) : (market?.lat ?? 10.7769),
  lng: sm.stallLongitude != null ? Number(sm.stallLongitude) : (market?.lng ?? 106.7009),
});

/** For a 07:00 Saturday slot, N hours before → the exact cutoff time and the day it lands on. */
function cutoffExample(hours: number) {
  const slotMinutes = 7 * 60;
  let cutoffMinutes = slotMinutes - hours * 60;
  let dayBefore = false;
  while (cutoffMinutes < 0) {
    cutoffMinutes += 24 * 60;
    dayBefore = true;
  }
  const time = `${String(Math.floor(cutoffMinutes / 60)).padStart(2, '0')}:${String(cutoffMinutes % 60).padStart(2, '0')}`;
  return { time: formatClock(time), day: dayName(dayBefore ? 5 : 6, 'long') };
}

const STATUS_CLASS: Record<StallDetailDto['approvalStatus'], string> = {
  approved: 'bg-status-completed-bg text-status-completed-ink',
  pending: 'bg-status-placed-bg text-status-placed-ink',
  rejected: 'bg-status-declined-bg text-status-declined-ink',
  suspended: 'bg-status-declined-bg text-status-declined-ink',
};

/** FR-060 FR-061 FR-067 — stall details, order cutoff, and per-market days, pickup windows and pin. */
const FarmerStallProfilePage = () => {
  const { t } = useTranslation('FarmerStallProfile');
  const { t: tc } = useTranslation();
  const { user } = useSession();
  const [tab, setTab] = useState<'stall' | 'markets'>('stall');

  const { state: load, retry, mutate } = useRequest('my-stall', () => StallApi.myProfile());
  const { state: marketsLoad } = useRequest('markets', () =>
    CatalogApi.listMarkets({ pageSize: FETCH_SIZE }).then((result) => result.items),
  );
  const allMarkets = marketsLoad.kind === 'ready' ? marketsLoad.data : NO_MARKETS;
  const stall = load.kind === 'ready' ? load.data : undefined;
  const approved = stall?.approvalStatus === 'approved';
  const marketById = (id: number) => allMarkets.find((m) => m.id === id);

  // Both forms mirror the loaded stall until something is typed, then they are their own state.
  const [editedForm, setEditedForm] = useState<StallForm | null>(null);
  const form = editedForm ?? (stall ? formFrom(stall) : { stallName: '', person: '', about: '', cutoffHours: 12 });
  const setForm = (patch: Partial<StallForm>) => setEditedForm({ ...form, ...patch });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const [edits, setEdits] = useState<Record<number, MarketSettings>>({});
  const settingsOf = (sm: StallMarketDto) => edits[sm.farmerMarketId] ?? settingsFrom(sm, marketById(sm.marketId));
  const updateSettings = (sm: StallMarketDto, patch: Partial<MarketSettings>) =>
    setEdits((current) => ({
      ...current,
      [sm.farmerMarketId]: { ...(current[sm.farmerMarketId] ?? settingsFrom(sm, marketById(sm.marketId))), ...patch },
    }));
  const [busyMarket, setBusyMarket] = useState<number | null>(null);
  const [savingMarkets, setSavingMarkets] = useState(false);

  if (load.kind === 'loading') {
    return <MarketCardSkeleton count={2} />;
  }
  if (load.kind === 'error' || !stall) {
    return <LoadError noun={t('error.noun')} onRetry={retry} />;
  }

  const saveDetails = async () => {
    const found: FormErrors = {};
    if (!form.stallName.trim()) found.stall = t('errors.required');
    if (!form.person.trim()) found.person = t('errors.required');
    if (!Number.isInteger(form.cutoffHours) || form.cutoffHours < CUTOFF_MIN || form.cutoffHours > CUTOFF_MAX) {
      found.cut = t('errors.cutoff', { min: CUTOFF_MIN, max: CUTOFF_MAX });
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const saved = await StallApi.updateProfile({
        stallName: form.stallName.trim(),
        contactPerson: form.person.trim(),
        description: form.about.trim() || undefined,
        orderCutoffHours: form.cutoffHours,
      });
      mutate(() => saved);
      setEditedForm(null);
      Notification.success({ title: t('saved'), text: t('details.savedText') });
    } catch (error) {
      const mapped: FormErrors = {};
      Object.entries(Helper.getFieldErrors(error)).forEach(([field, message]) => {
        const key = SERVER_FIELDS[field];
        if (key) mapped[key] = message;
      });
      if (Object.keys(mapped).length) setErrors(mapped);
      else Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setSaving(false);
    }
  };

  /** Ticking a market joins it right away (POST); unticking leaves it (DELETE, a soft delete on the server). */
  const toggleMarket = async (m: MarketType, checked: boolean) => {
    setBusyMarket(m.id);
    try {
      if (checked) {
        const joined = await StallApi.joinMarket({ marketId: m.id, stallLatitude: m.lat, stallLongitude: m.lng });
        mutate((s) => ({ ...s, markets: [...s.markets, joined] }));
        Notification.success({ text: t('markets.joined', { name: m.name }) });
      } else {
        const sm = stall.markets.find((x) => x.marketId === m.id);
        if (!sm) return;
        await StallApi.leaveMarket(sm.farmerMarketId);
        mutate((s) => ({ ...s, markets: s.markets.filter((x) => x.farmerMarketId !== sm.farmerMarketId) }));
        setEdits((current) => {
          const next = { ...current };
          delete next[sm.farmerMarketId];
          return next;
        });
        Notification.success({ text: t('markets.left', { name: m.name }) });
      }
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusyMarket(null);
    }
  };

  /**
   * Days and windows go through PUT …/days. The contract has no PUT for the stall code or pin, so a changed code or pin
   * re-joins the market (DELETE then POST): the server reuses the same row, so slots and orders keep pointing at it.
   */
  const saveMarkets = async () => {
    for (const sm of stall.markets) {
      const s = settingsOf(sm);
      if (s.days.length === 0 || s.end <= s.start) {
        Notification.error({ text: t('markets.windowError', { market: sm.marketName }) });
        return;
      }
    }
    setSavingMarkets(true);
    try {
      const updated: StallMarketDto[] = [];
      for (const sm of stall.markets) {
        const s = settingsOf(sm);
        const base = settingsFrom(sm, marketById(sm.marketId));
        let id = sm.farmerMarketId;
        if (s.code !== base.code || s.lat !== base.lat || s.lng !== base.lng) {
          await StallApi.leaveMarket(id);
          const rejoined = await StallApi.joinMarket({
            marketId: sm.marketId,
            stallCode: s.code.trim() || undefined,
            stallLatitude: s.lat,
            stallLongitude: s.lng,
          });
          id = rejoined.farmerMarketId;
        }
        updated.push(
          await StallApi.setDays(
            id,
            s.days.map((d) => ({ dayOfWeek: d, pickupStartTime: s.start, pickupEndTime: s.end })),
          ),
        );
      }
      mutate((current) => ({ ...current, markets: updated }));
      setEdits({});
      Notification.success({ title: t('saved'), text: t('markets.savedText') });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setSavingMarkets(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        <span
          className={Helper.cn(
            'inline-flex items-center rounded-full py-1 pr-3 pl-3 text-[13px] font-bold',
            STATUS_CLASS[stall.approvalStatus],
          )}
        >
          {t(`status.${stall.approvalStatus}`)}
        </span>
      </div>

      <Tabs
        label={t('tabs.label')}
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'stall', label: t('tabs.stall') },
          { id: 'markets', label: t('tabs.markets'), count: stall.markets.length },
        ]}
      />

      {tab === 'stall' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveDetails();
          }}
          className="flex flex-col gap-6"
          noValidate
        >
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-h3">{t('details.title')}</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                id="stall"
                label={t('details.stallName')}
                required
                value={form.stallName}
                onChange={(e) => setForm({ stallName: e.target.value })}
                error={errors.stall}
              />
              <Field
                id="person"
                label={t('details.person')}
                required
                value={form.person}
                onChange={(e) => setForm({ person: e.target.value })}
                error={errors.person}
              />
              <Field
                id="phone"
                label={t('details.phone')}
                value={user?.phone ?? ''}
                readOnly
                hint={t('details.accountHint')}
              />
              <Field id="email" label={t('details.email')} type="email" value={user?.email ?? ''} readOnly />
              <div className="md:col-span-2">
                <Field id="addr" label={t('details.address')} value={user?.address ?? ''} readOnly />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label htmlFor="about" className="text-small font-bold">
                  {t('details.about')}
                </label>
                <textarea
                  id="about"
                  value={form.about}
                  onChange={(e) => setForm({ about: e.target.value })}
                  className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
                />
                <span className="text-ink-muted text-[13px]">{t('details.aboutHint')}</span>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-h3">{t('cutoff.title')}</h2>
            <Field
              id="cut"
              label={t('cutoff.label')}
              required
              inputMode="numeric"
              value={form.cutoffHours}
              onChange={(e) => setForm({ cutoffHours: Math.max(0, Number(e.target.value) || 0) })}
              error={errors.cut}
              hint={t('cutoff.hint', {
                count: form.cutoffHours,
                slot: formatClock('07:00'),
                saturday: dayName(6, 'long'),
                ...cutoffExample(form.cutoffHours),
              })}
            />
          </Card>

          <div>
            <Button type="submit" disabled={saving}>
              {t('details.save')}
            </Button>
          </div>
        </form>
      )}

      {tab === 'markets' && (
        <div className="flex flex-col gap-6">
          {!approved && (
            <Banner variant="info" title={t(`status.${stall.approvalStatus}`)}>
              {t('markets.notApproved')}
            </Banner>
          )}
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('markets.title')}</h2>
            <p className="text-small text-ink-muted">{t('markets.intro')}</p>
            {marketsLoad.kind === 'loading' ? (
              <MarketCardSkeleton count={2} />
            ) : (
              <div className="flex flex-col gap-2">
                {allMarkets.map((m) => (
                  <Checkbox
                    key={m.id}
                    id={`mk-${m.id}`}
                    checked={stall.markets.some((sm) => sm.marketId === m.id)}
                    disabled={!approved || busyMarket === m.id}
                    onChange={(e) => void toggleMarket(m, e.target.checked)}
                  >
                    <b className="block">{m.name}</b>
                    <span className="text-ink-muted block text-[13px]">
                      {dayList(m.days)} · {formatClock(m.open)}–{formatClock(m.close)}
                    </span>
                  </Checkbox>
                ))}
              </div>
            )}
          </Card>

          {stall.markets.map((sm, index) => {
            const m = marketById(sm.marketId);
            const s = settingsOf(sm);
            const marketDays = m?.days ?? [0, 1, 2, 3, 4, 5, 6];
            return (
              <Card key={sm.farmerMarketId} className="flex flex-col gap-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-h3">{sm.marketName}</h2>
                  {m && (
                    <span className="text-small text-ink-muted">
                      {t('markets.runs', {
                        days: dayList(m.days),
                        open: formatClock(m.open),
                        close: formatClock(m.close),
                      })}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field
                    id={`code${sm.farmerMarketId}`}
                    label={t('markets.code')}
                    value={s.code}
                    onChange={(e) => updateSettings(sm, { code: e.target.value })}
                    hint={t('markets.codeHint')}
                  />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-small font-bold">{t('markets.days')}</span>
                    <div className="mt-0.5 flex flex-wrap gap-3">
                      {marketDays.map((d) => (
                        <Checkbox
                          key={d}
                          id={`d${sm.farmerMarketId}-${d}`}
                          checked={s.days.includes(d)}
                          onChange={(e) =>
                            updateSettings(sm, {
                              days: e.target.checked ? [...s.days, d] : s.days.filter((x) => x !== d),
                            })
                          }
                        >
                          {dayName(d)}
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                  <Field
                    id={`ps${sm.farmerMarketId}`}
                    label={t('markets.start')}
                    type="time"
                    value={s.start}
                    onChange={(e) => updateSettings(sm, { start: e.target.value })}
                  />
                  <Field
                    id={`pe${sm.farmerMarketId}`}
                    label={t('markets.end')}
                    type="time"
                    value={s.end}
                    onChange={(e) => updateSettings(sm, { end: e.target.value })}
                  />
                </div>

                {index === 0 && m ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <span className="text-small font-bold">{t('markets.location')}</span>
                      <LocationPicker
                        label={t('markets.mapLabel')}
                        className="min-h-80"
                        market={{ lat: m.lat, lng: m.lng, name: m.name }}
                        lat={s.lat}
                        lng={s.lng}
                        pinLabel={t('map.yourStall')}
                        onMove={(lat, lng) => updateSettings(sm, { lat, lng })}
                      />
                      <p className="text-caption text-ink-muted">{t('markets.mapHint')}</p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <Field
                        id={`lat${sm.farmerMarketId}`}
                        label={t('markets.lat')}
                        value={s.lat.toFixed(6)}
                        onChange={(e) => updateSettings(sm, { lat: Number(e.target.value) || s.lat })}
                      />
                      <Field
                        id={`lng${sm.farmerMarketId}`}
                        label={t('markets.lng')}
                        value={s.lng.toFixed(6)}
                        onChange={(e) => updateSettings(sm, { lng: Number(e.target.value) || s.lng })}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="self-start"
                        onClick={() => {
                          updateSettings(sm, { lat: m.lat, lng: m.lng });
                          Notification.success({
                            title: t('markets.pinMoved'),
                            text: t('markets.pinMovedText'),
                          });
                        }}
                      >
                        {t('markets.useMarket')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field
                      id={`lat${sm.farmerMarketId}`}
                      label={t('markets.lat')}
                      value={s.lat.toFixed(6)}
                      onChange={(e) => updateSettings(sm, { lat: Number(e.target.value) || s.lat })}
                    />
                    <Field
                      id={`lng${sm.farmerMarketId}`}
                      label={t('markets.lng')}
                      value={s.lng.toFixed(6)}
                      onChange={(e) => updateSettings(sm, { lng: Number(e.target.value) || s.lng })}
                    />
                  </div>
                )}
              </Card>
            );
          })}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => void saveMarkets()}
              disabled={!approved || savingMarkets || stall.markets.length === 0}
            >
              {t('markets.save')}
            </Button>
            <Link to="/farmer/slots" className="text-small text-brand underline">
              {t('markets.slotsLink')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerStallProfilePage;
