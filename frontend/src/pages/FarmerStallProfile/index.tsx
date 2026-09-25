import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/input';
import Tabs from '@/components/ui/tabs';
import { farmer } from '@/data/catalog';
import { markets } from '@/data/home';
import { dayList, dayName, formatClock, formatDate } from '@/lib/format';
import Notification from '@/utils/notification';
import StallLocationMap from './StallLocationMap';

type MarketSettings = { code: string; days: number[]; start: string; end: string; lat: number; lng: number };

const f = farmer(1)!;

const INITIAL_SETTINGS: Record<number, MarketSettings> = {
  1: { code: 'A12', days: [6, 0], start: '06:00', end: '10:30', lat: f.lat!, lng: f.lng! },
  2: { code: 'B02', days: [0], start: '06:00', end: '09:30', lat: 10.8504, lng: 106.7713 },
};

function defaultSettingsFor(marketId: number): MarketSettings {
  const m = markets.find((mk) => mk.id === marketId)!;
  return { code: '', days: [...m.days], start: m.open, end: m.close, lat: m.lat, lng: m.lng };
}

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

/** FR-060 FR-061 FR-067 — stall details, order cutoff, and per-market days, pickup windows and pin. */
const FarmerStallProfilePage = () => {
  const { t } = useTranslation('FarmerStallProfile');
  const [tab, setTab] = useState<'stall' | 'markets'>('stall');

  const [stallName, setStallName] = useState(f.stall);
  const [person, setPerson] = useState(f.person);
  const [phone, setPhone] = useState(f.phone);
  const [email, setEmail] = useState(f.email);
  const [address, setAddress] = useState('Hamlet 3, Tân Phú Trung, Củ Chi');
  const [about, setAbout] = useState(f.about);
  const [cutoffHours, setCutoffHours] = useState(f.cutoffHours);

  const [selectedMarkets, setSelectedMarkets] = useState<number[]>(f.markets);
  const [settings, setSettings] = useState<Record<number, MarketSettings>>(INITIAL_SETTINGS);

  const toggleMarket = (id: number, checked: boolean) => {
    setSelectedMarkets((prev) => (checked ? [...prev, id] : prev.filter((m) => m !== id)));
    setSettings((prev) => (prev[id] ? prev : { ...prev, [id]: defaultSettingsFor(id) }));
  };

  const updateSettings = (id: number, patch: Partial<MarketSettings>) =>
    setSettings((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        <span className="bg-status-completed-bg text-status-completed-ink inline-flex items-center rounded-full py-1 pr-3 pl-3 text-[13px] font-bold">
          {t('approved', { date: formatDate(new Date(2026, 7, 5)) })}
        </span>
      </div>

      <Tabs
        label={t('tabs.label')}
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'stall', label: t('tabs.stall') },
          { id: 'markets', label: t('tabs.markets'), count: selectedMarkets.length },
        ]}
      />

      {tab === 'stall' && (
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-h3">{t('details.title')}</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                id="stall"
                label={t('details.stallName')}
                required
                value={stallName}
                onChange={(e) => setStallName(e.target.value)}
              />
              <Field
                id="person"
                label={t('details.person')}
                required
                value={person}
                onChange={(e) => setPerson(e.target.value)}
              />
              <Field
                id="phone"
                label={t('details.phone')}
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                hint={t('details.phoneHint')}
              />
              <Field
                id="email"
                label={t('details.email')}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="md:col-span-2">
                <Field
                  id="addr"
                  label={t('details.address')}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label htmlFor="about" className="text-small font-bold">
                  {t('details.about')}
                </label>
                <textarea
                  id="about"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
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
              value={cutoffHours}
              onChange={(e) => setCutoffHours(Math.max(0, Number(e.target.value) || 0))}
              hint={t('cutoff.hint', {
                count: cutoffHours,
                slot: formatClock('07:00'),
                saturday: dayName(6, 'long'),
                ...cutoffExample(cutoffHours),
              })}
            />
          </Card>

          <div>
            <Button onClick={() => Notification.success({ title: t('saved'), text: t('details.savedText') })}>
              {t('details.save')}
            </Button>
          </div>
        </form>
      )}

      {tab === 'markets' && (
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('markets.title')}</h2>
            <p className="text-small text-ink-muted">{t('markets.intro')}</p>
            <div className="flex flex-col gap-2">
              {markets.map((m) => (
                <Checkbox
                  key={m.id}
                  id={`mk-${m.id}`}
                  checked={selectedMarkets.includes(m.id)}
                  onChange={(e) => toggleMarket(m.id, e.target.checked)}
                >
                  <b className="block">{m.name}</b>
                  <span className="text-ink-muted block text-[13px]">
                    {dayList(m.days)} · {formatClock(m.open)}–{formatClock(m.close)}
                  </span>
                </Checkbox>
              ))}
            </div>
          </Card>

          {selectedMarkets.map((id) => {
            const m = markets.find((mk) => mk.id === id)!;
            const s = settings[id] ?? defaultSettingsFor(id);
            return (
              <Card key={id} className="flex flex-col gap-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-h3">{m.name}</h2>
                  <span className="text-small text-ink-muted">
                    {t('markets.runs', {
                      days: dayList(m.days),
                      open: formatClock(m.open),
                      close: formatClock(m.close),
                    })}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field
                    id={`code${id}`}
                    label={t('markets.code')}
                    value={s.code}
                    onChange={(e) => updateSettings(id, { code: e.target.value })}
                    hint={t('markets.codeHint')}
                  />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-small font-bold">{t('markets.days')}</span>
                    <div className="mt-0.5 flex flex-wrap gap-3">
                      {m.days.map((d) => (
                        <Checkbox
                          key={d}
                          id={`d${id}-${d}`}
                          checked={s.days.includes(d)}
                          onChange={(e) =>
                            updateSettings(id, {
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
                    id={`ps${id}`}
                    label={t('markets.start')}
                    type="time"
                    value={s.start}
                    onChange={(e) => updateSettings(id, { start: e.target.value })}
                  />
                  <Field
                    id={`pe${id}`}
                    label={t('markets.end')}
                    type="time"
                    value={s.end}
                    onChange={(e) => updateSettings(id, { end: e.target.value })}
                  />
                </div>

                {id === 1 ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <span className="text-small font-bold">{t('markets.location')}</span>
                      <StallLocationMap
                        label={t('markets.mapLabel')}
                        className="min-h-80"
                        marketLat={m.lat}
                        marketLng={m.lng}
                        marketName={m.name}
                        stallLat={s.lat}
                        stallLng={s.lng}
                        onMove={(lat, lng) => updateSettings(id, { lat, lng })}
                      />
                      <p className="text-caption text-ink-muted">{t('markets.mapHint')}</p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <Field
                        id={`lat${id}`}
                        label={t('markets.lat')}
                        value={s.lat.toFixed(6)}
                        onChange={(e) => updateSettings(id, { lat: Number(e.target.value) || s.lat })}
                      />
                      <Field
                        id={`lng${id}`}
                        label={t('markets.lng')}
                        value={s.lng.toFixed(6)}
                        onChange={(e) => updateSettings(id, { lng: Number(e.target.value) || s.lng })}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="self-start"
                        onClick={() => {
                          updateSettings(id, { lat: m.lat, lng: m.lng });
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
                      id={`lat${id}`}
                      label={t('markets.lat')}
                      value={s.lat.toFixed(6)}
                      onChange={(e) => updateSettings(id, { lat: Number(e.target.value) || s.lat })}
                    />
                    <Field
                      id={`lng${id}`}
                      label={t('markets.lng')}
                      value={s.lng.toFixed(6)}
                      onChange={(e) => updateSettings(id, { lng: Number(e.target.value) || s.lng })}
                    />
                  </div>
                )}
              </Card>
            );
          })}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() =>
                Notification.success({
                  title: t('saved'),
                  text: t('markets.savedText'),
                })
              }
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
