import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/input';
import Tabs from '@/components/ui/tabs';
import { farmer } from '@/data/catalog';
import { markets } from '@/data/home';
import { dayList } from '@/lib/format';
import Notification from '@/utils/notification';
import StallLocationMap from './StallLocationMap';

const DOW_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

/** For a 07:00 Saturday slot, N hours before → the exact cutoff time and whether it lands the day before. */
function cutoffExample(hours: number) {
  const slotMinutes = 7 * 60;
  let cutoffMinutes = slotMinutes - hours * 60;
  let dayBefore = false;
  while (cutoffMinutes < 0) {
    cutoffMinutes += 24 * 60;
    dayBefore = true;
  }
  const time = `${String(Math.floor(cutoffMinutes / 60)).padStart(2, '0')}:${String(cutoffMinutes % 60).padStart(2, '0')}`;
  return `${time} on ${dayBefore ? 'Friday' : 'Saturday'}`;
}

/** FR-060 FR-061 FR-067 — stall details, order cutoff, and per-market days, pickup windows and pin. */
const FarmerStallProfilePage = () => {
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
          <h1 className="text-h1">Stall &amp; pickup</h1>
          <p className="text-body max-w-160">
            What customers see about your stall, the markets you sell at, your operating days and pickup windows, and
            where the stall is on the map.
          </p>
        </div>
        <span className="bg-status-completed-bg text-status-completed-ink inline-flex items-center rounded-full py-1 pr-3 pl-3 text-[13px] font-bold">
          Approved on 05/08/2026
        </span>
      </div>

      <Tabs
        label="Stall settings"
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'stall', label: 'Stall details' },
          { id: 'markets', label: 'Markets, days and pickup', count: selectedMarkets.length },
        ]}
      />

      {tab === 'stall' && (
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-h3">Stall details</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                id="stall"
                label="Stall name"
                required
                value={stallName}
                onChange={(e) => setStallName(e.target.value)}
              />
              <Field
                id="person"
                label="Contact person"
                required
                value={person}
                onChange={(e) => setPerson(e.target.value)}
              />
              <Field
                id="phone"
                label="Phone number"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                hint="Shown to customers on their order ticket."
              />
              <Field
                id="email"
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="md:col-span-2">
                <Field
                  id="addr"
                  label="Farm or business address"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label htmlFor="about" className="text-small font-bold">
                  About the stall
                </label>
                <textarea
                  id="about"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
                />
                <span className="text-ink-muted text-[13px]">
                  Shown in handwriting on your stall page. One or two sentences.
                </span>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-h3">Order cutoff</h2>
            <Field
              id="cut"
              label="Stop taking changes this many hours before the pickup slot"
              required
              inputMode="numeric"
              value={cutoffHours}
              onChange={(e) => setCutoffHours(Math.max(0, Number(e.target.value) || 0))}
              hint={`For a 07:00 Saturday slot, ${cutoffHours} hours means ${cutoffExample(cutoffHours)}. Customers cannot edit or cancel after that, and new orders for that slot close too (D-05).`}
            />
          </Card>

          <div>
            <Button onClick={() => Notification.success({ title: 'Saved', text: 'Stall details saved.' })}>
              Save stall details
            </Button>
          </div>
        </form>
      )}

      {tab === 'markets' && (
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">Markets you sell at</h2>
            <p className="text-small text-ink-muted">
              Tick a market to open its settings. Days and pickup windows are set per market.
            </p>
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
                    {dayList(m.days)} · {m.open}–{m.close}
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
                    Market runs {dayList(m.days)} · {m.open}–{m.close}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field
                    id={`code${id}`}
                    label="Stall code or spot"
                    value={s.code}
                    onChange={(e) => updateSettings(id, { code: e.target.value })}
                    hint="Shown on the order ticket so customers find you."
                  />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-small font-bold">Operating days at this market</span>
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
                          {DOW_LABEL[d]}
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                  <Field
                    id={`ps${id}`}
                    label="Pickup window starts"
                    type="time"
                    value={s.start}
                    onChange={(e) => updateSettings(id, { start: e.target.value })}
                  />
                  <Field
                    id={`pe${id}`}
                    label="Pickup window ends"
                    type="time"
                    value={s.end}
                    onChange={(e) => updateSettings(id, { end: e.target.value })}
                  />
                </div>

                {id === 1 ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <span className="text-small font-bold">Stall location</span>
                      <StallLocationMap
                        label="Pin the stall on the map"
                        className="min-h-80"
                        marketLat={m.lat}
                        marketLng={m.lng}
                        marketName={m.name}
                        stallLat={s.lat}
                        stallLng={s.lng}
                        onMove={(lat, lng) => updateSettings(id, { lat, lng })}
                      />
                      <p className="text-caption text-ink-muted">
                        Drag the round pin to your spot inside the market. The square pin is the market itself.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <Field
                        id={`lat${id}`}
                        label="Latitude"
                        value={s.lat.toFixed(6)}
                        onChange={(e) => updateSettings(id, { lat: Number(e.target.value) || s.lat })}
                      />
                      <Field
                        id={`lng${id}`}
                        label="Longitude"
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
                            title: 'Pin moved',
                            text: 'Pin moved to the market entrance. Drag it to your spot.',
                          });
                        }}
                      >
                        Use the market&apos;s location
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field
                      id={`lat${id}`}
                      label="Latitude"
                      value={s.lat.toFixed(6)}
                      onChange={(e) => updateSettings(id, { lat: Number(e.target.value) || s.lat })}
                    />
                    <Field
                      id={`lng${id}`}
                      label="Longitude"
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
                  title: 'Saved',
                  text: 'Markets, days and pickup windows saved. Slots for next week follow the new windows.',
                })
              }
            >
              Save markets and pickup
            </Button>
            <Link to="/farmer/slots" className="text-small text-brand underline">
              Manage pickup slots
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerStallProfilePage;
