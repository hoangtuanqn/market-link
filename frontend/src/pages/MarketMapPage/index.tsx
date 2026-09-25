import { useMemo, useState } from 'react';
import DayChips from '@/components/DayChips';
import MarketCard from '@/components/MarketCard';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import { farmers } from '@/data/catalog';
import { markets } from '@/data/home';
import useClock from '@/hooks/useClock';
import { formatTime, upcoming, weekday } from '@/lib/format';

/** Monday first, matching `market_operating_days.day_of_week` where 0 is Sunday. */
const DAY_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];
const DOW_ABBR: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

const pad = (n: number) => String(n).padStart(2, '0');
const dayLabel = (dow: number) => DAY_OPTIONS.find((d) => d.value === dow)?.label ?? '';
const openOn = (dow: number) => markets.filter((m) => m.days.includes(dow));
const plural = (n: number) => `${n} market${n === 1 ? '' : 's'}`;

/**
 * FR-012 FR-023 — every market and every stall taking pre-orders, on one map. The list pages answer "what is open on
 * Saturday"; this page answers "what is near me", which is a question about space rather than about a list, so the map
 * is the page rather than a panel beside it.
 */
const MarketMapPage = () => {
  const now = useClock();
  const [day, setDay] = useState(6);
  const [showMarkets, setShowMarkets] = useState(true);
  const [showStalls, setShowStalls] = useState(true);

  const marketsToday = useMemo(() => openOn(day), [day]);

  /** Approved stalls trading on the chosen day at one of the markets open that day. */
  const stallsToday = useMemo(() => {
    const openIds = new Set(marketsToday.map((m) => m.id));
    const abbr = DOW_ABBR[day];
    return farmers.filter(
      (f) =>
        f.approval === 'approved' &&
        f.lat != null &&
        f.lng != null &&
        f.days.split(', ').includes(abbr) &&
        f.markets.some((id) => openIds.has(id)),
    );
  }, [marketsToday, day]);

  const mapMarkers = useMemo<MapMarker[]>(() => {
    const pins: MapMarker[] = [];
    if (showMarkets) {
      marketsToday.forEach((m) =>
        pins.push({
          lat: m.lat,
          lng: m.lng,
          kind: 'market',
          label: m.name,
          popup: {
            title: m.name,
            lines: [`${m.open}–${m.close}`, `${m.stalls} stalls`, m.district],
            href: `/markets/${m.id}`,
          },
        }),
      );
    }
    if (showStalls) {
      stallsToday.forEach((f) =>
        pins.push({
          lat: f.lat as number,
          lng: f.lng as number,
          kind: 'stall',
          label: f.stall,
          popup: {
            title: f.stall,
            lines: [`Stall ${f.stallCode} · pickup ${f.pickup}`],
            href: `/stalls/${f.id}`,
          },
        }),
      );
    }
    return pins;
  }, [marketsToday, stallsToday, showMarkets, showStalls]);

  const bothLayersOff = !showMarkets && !showStalls;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-hand text-hand text-ink-muted">
          <time dateTime={now.toISOString()}>
            {weekday(now)} {pad(now.getDate())}/{pad(now.getMonth() + 1)} · {formatTime(now)}
          </time>{' '}
          · Ho Chi Minh City
        </p>
        <h1 className="font-hand md:text-display my-2 text-[40px] leading-[46px]">Market map</h1>
        <p className="text-body-lg max-w-155">
          Every market and every stall taking pre-orders on the day you choose. Open a pin for hours, pickup windows and
          directions.
        </p>
      </div>

      <Card as="section" aria-label="Filter the map" className="flex flex-col gap-4 p-4">
        <DayChips
          legend="Market day"
          name="map-day"
          value={String(day)}
          onChange={(v) => setDay(Number(v))}
          options={DAY_OPTIONS.map((d) => ({
            value: String(d.value),
            label: d.label,
            date: upcoming(d.value, now),
            disabled: openOn(d.value).length === 0,
          }))}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Chip pressed={showMarkets} onClick={() => setShowMarkets((v) => !v)}>
              Markets ({marketsToday.length})
            </Chip>
            <Chip pressed={showStalls} onClick={() => setShowStalls((v) => !v)}>
              Stalls ({stallsToday.length})
            </Chip>
          </div>
          {/* Shape carries the meaning as well as colour, so the legend names both. */}
          <p className="text-caption text-ink-muted m-0">Square pin, market · Round pin, stall</p>
        </div>
      </Card>

      {bothLayersOff ? (
        <DataState
          className="max-w-none flex-none"
          title="Nothing to show on the map"
          text="Both layers are switched off. Turn markets or stalls back on to see the pins."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowMarkets(true);
                setShowStalls(true);
              }}
            >
              Show both
            </Button>
          }
        />
      ) : (
        <MarketMap label="Map of every market and stall" markers={mapMarkers} className="min-h-100 md:min-h-155" />
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-h2">Open on {dayLabel(day)}</h2>
          <span className="text-small text-ink-muted">{plural(marketsToday.length)}</span>
        </div>
        {marketsToday.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {marketsToday.map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        ) : (
          <DataState
            className="max-w-none flex-none"
            title={`No markets open on ${dayLabel(day)}`}
            text={`Saturday is the busiest day, with ${plural(openOn(6).length)} open.`}
            action={
              <Button variant="secondary" size="sm" onClick={() => setDay(6)}>
                Show Saturday
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
};

export default MarketMapPage;
