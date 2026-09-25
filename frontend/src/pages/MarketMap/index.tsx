import { useMemo, useState } from 'react';
import DayChips from '@/components/DayChips';
import MarketCard from '@/components/MarketCard';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import { farmers } from '@/data/catalog';
import { markets } from '@/data/home';
import { dayList } from '@/lib/format';

type DayValue = 'thu' | 'fri' | 'sat' | 'sun';

const DAY_OPTIONS: { value: DayValue; label: string; sub: string; disabled?: boolean }[] = [
  { value: 'thu', label: 'Thu', sub: '24/09', disabled: true },
  { value: 'fri', label: 'Fri', sub: '25/09' },
  { value: 'sat', label: 'Sat', sub: '26/09' },
  { value: 'sun', label: 'Sun', sub: '27/09' },
];
const DOW: Record<DayValue, number> = { thu: 4, fri: 5, sat: 6, sun: 0 };
const DAY_FULL: Record<DayValue, string> = { thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

/** FR-012 FR-013 — every market and its approved stalls on the map, for the day you choose. */
const MarketMapPage = () => {
  const [day, setDay] = useState<DayValue>('sat');
  const [showMarkets, setShowMarkets] = useState(true);
  const [showStalls, setShowStalls] = useState(true);
  const [savedOnly, setSavedOnly] = useState(false);

  const dow = DOW[day];
  const openMarkets = useMemo(
    () => markets.filter((m) => m.days.includes(dow) && (!savedOnly || m.saved)),
    [dow, savedOnly],
  );
  const openMarketIds = useMemo(() => new Set(openMarkets.map((m) => m.id)), [openMarkets]);

  const openStalls = useMemo(
    () =>
      farmers.filter(
        (f) => f.approval === 'approved' && f.lat != null && f.markets.some((id) => openMarketIds.has(id)),
      ),
    [openMarketIds],
  );

  const markers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];
    if (showMarkets)
      out.push(
        ...openMarkets.map((m) => ({
          lat: m.lat,
          lng: m.lng,
          kind: 'market' as const,
          label: m.name,
          popup: {
            title: m.name,
            lines: [`${dayList(m.days)} · ${m.open}–${m.close}`, `${m.stalls} stalls`],
            href: `/markets/${m.id}`,
          },
        })),
      );
    if (showStalls)
      out.push(
        ...openStalls.map((f) => ({
          lat: f.lat!,
          lng: f.lng!,
          kind: 'stall' as const,
          popup: { title: f.stall, lines: [`${f.days} · pickup ${f.pickup}`], href: `/stalls/${f.id}` },
        })),
      );
    return out;
  }, [openMarkets, openStalls, showMarkets, showStalls]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">
            {DAY_FULL[day]} {DAY_OPTIONS.find((d) => d.value === day)?.sub}
          </p>
          <h1 className="text-h1">Market map</h1>
          <p className="text-body-lg max-w-160">
            All markets and the stalls taking pre-orders on the day you choose. Tap a pin for hours, pickup windows and
            directions.
          </p>
        </div>
        <DayChips
          legend="Market day"
          name="map-day"
          options={DAY_OPTIONS}
          value={day}
          onChange={(v) => setDay(v as DayValue)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Chip pressed={showMarkets} onClick={() => setShowMarkets((v) => !v)}>
            Markets
          </Chip>
          <Chip pressed={showStalls} onClick={() => setShowStalls((v) => !v)}>
            Stalls
          </Chip>
          <Chip pressed={savedOnly} onClick={() => setSavedOnly((v) => !v)}>
            Saved only
          </Chip>
        </div>
        <div className="text-small text-ink-muted flex flex-wrap gap-4">
          <span>Square, market</span>
          <span>Round, stall</span>
          <span>Ring, selected</span>
        </div>
      </div>

      <MarketMap label="Map of all markets and stalls" markers={markers} className="min-h-155" />
      <p className="text-small text-ink-muted">Directions open in OpenStreetMap in a new tab (D-12).</p>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">Open on {DAY_FULL[day]}</h2>
        {openMarkets.length ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {openMarkets.map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        ) : (
          <DataState
            title="No markets to show"
            text="Nothing matches the day you picked. Try another day, or clear the filter."
          />
        )}
      </section>
    </div>
  );
};

export default MarketMapPage;
