import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CatalogApi from '@/api-requests/catalog.requests';
import StallApi, { type StallMarketDto } from '@/api-requests/stall.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { LoadError } from '@/components/ui/data-state';
import Tabs from '@/components/ui/tabs';
import useRequest from '@/hooks/useRequest';
import useSession from '@/hooks/useSession';
import type { MarketType } from '@/types/market.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import {
  CUTOFF_MAX,
  CUTOFF_MIN,
  FETCH_SIZE,
  formFrom,
  NO_MARKETS,
  SERVER_FIELDS,
  settingsFrom,
  STALL_CODE_MAX,
  STATUS_CLASS,
  type FormErrors,
  type MarketSettings,
  type StallForm,
} from './constants';
import MarketsTab from './MarketsTab';
import StallDetailsTab from './StallDetailsTab';

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
      // FR-060: checked before any request, so no market is saved halfway
      if (s.code.trim().length > STALL_CODE_MAX) {
        Notification.error({ text: t('markets.codeError', { market: sm.marketName, max: STALL_CODE_MAX }) });
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
          const updatedMarket = await StallApi.updateMarket(id, {
            stallCode: s.code.trim() || undefined,
            stallLatitude: s.lat,
            stallLongitude: s.lng,
          });
          id = updatedMarket.farmerMarketId;
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
      // Markets saved before the failing one are on the server now: show what it holds, keep the typed edits
      StallApi.myProfile()
        .then((fresh) => mutate(() => fresh))
        .catch(() => undefined);
    } finally {
      setSavingMarkets(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 text-ink font-bold">{t('title')}</h1>
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
        <StallDetailsTab
          form={form}
          errors={errors}
          saving={saving}
          user={user}
          onChange={setForm}
          onSave={() => void saveDetails()}
        />
      )}

      {tab === 'markets' && (
        <MarketsTab
          stall={stall}
          allMarkets={allMarkets}
          marketsLoading={marketsLoad.kind === 'loading'}
          approved={approved}
          busyMarket={busyMarket}
          savingMarkets={savingMarkets}
          marketById={marketById}
          settingsOf={settingsOf}
          onToggleMarket={(m, checked) => void toggleMarket(m, checked)}
          onUpdate={updateSettings}
          onSave={() => void saveMarkets()}
        />
      )}
    </div>
  );
};

export default FarmerStallProfilePage;
