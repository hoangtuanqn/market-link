import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import DayChips from '@/components/DayChips';
import MarketCard from '@/components/MarketCard';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import { SelectField } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import useClock from '@/hooks/useClock';
import { markets } from '@/data/home';
import { dayList, formatTime, upcoming, weekday } from '@/lib/format';
import Notification from '@/utils/notification';

const PAGE_SIZE = 3;
/** All seven weekdays, Monday first, matching `market_operating_days.day_of_week` (0 = Sunday). */
const DAY_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];
const SORTS = [
  { value: 'near', label: 'Nearest first' },
  { value: 'stalls', label: 'Most stalls' },
  { value: 'opens', label: 'Opens earliest' },
];
/** FR-084: the four states of this list. Empty is reachable for real, so it needs no demo switch. */
const VIEWS = [
  { value: 'loaded', label: 'With data' },
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Error' },
] as const;

type View = (typeof VIEWS)[number]['value'];

/**
 * How long the skeleton is held on the first visit and on every page change. The markets are still demo data in
 * `src/data/home.ts`, so there is nothing to wait for; this stands in for the request until `GET /api/markets` exists,
 * and the wait comes off when the page starts asking the server.
 */
const LOADING_MS = 1200;

const pad = (n: number) => String(n).padStart(2, '0');
const dayLabel = (dow: number) => DAY_OPTIONS.find((d) => d.value === dow)?.label ?? '';
const openOn = (dow: number) => markets.filter((m) => m.days.includes(dow));
const plural = (n: number) => `${n} market${n === 1 ? '' : 's'}`;

/** FR-010 — browse markets by location and day. */
const MarketsPage = () => {
  const now = useClock();
  const [day, setDay] = useState(6);
  const [area, setArea] = useState('all');
  const [sort, setSort] = useState('near');
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);
  /** The demo switcher at the foot of the page; null means "show whatever is really happening". */
  const [override, setOverride] = useState<View | null>(null);
  /** The page whose markets have arrived. Anything else means the list is still on its way. */
  const [readyPage, setReadyPage] = useState<number | null>(null);

  // Arriving on the page, and every move to another page, shows the skeleton first (FR-084).
  useEffect(() => {
    const id = window.setTimeout(() => setReadyPage(page), LOADING_MS);
    return () => window.clearTimeout(id);
  }, [page]);

  const view: View = override ?? (readyPage === page ? 'loaded' : 'loading');

  const onDay = useMemo(() => openOn(day), [day]);
  // Areas come from the markets themselves, so a new market in a new district needs no edit here (FR-010).
  const areas = useMemo(() => [...new Set(markets.map((m) => m.district))].sort((a, b) => a.localeCompare(b)), []);

  const matches = useMemo(() => {
    const list = onDay.filter((m) => area === 'all' || m.district === area);
    return [...list].sort((a, b) => {
      if (sort === 'stalls') return b.stalls - a.stalls;
      if (sort === 'opens') return a.open.localeCompare(b.open);
      return parseFloat(a.distance ?? '0') - parseFloat(b.distance ?? '0');
    });
  }, [onDay, area, sort]);

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const slice = matches.slice(from, from + PAGE_SIZE);
  const where = area === 'all' ? '' : ` in ${area}`;

  // The map follows the filters; with nothing to show it falls back to every market rather than an empty city view.
  const mapMarkers = useMemo<MapMarker[]>(() => {
    const shown = matches.length ? matches : markets;
    const onPage = new Set(matches.slice(from, from + PAGE_SIZE).map((m) => m.id));
    return shown.map((m) => ({
      lat: m.lat,
      lng: m.lng,
      kind: 'market',
      label: m.name,
      selected: onPage.has(m.id),
      popup: {
        title: m.name,
        lines: [`${dayList(m.days)} · ${m.open}–${m.close}`, `${m.stalls} stalls`, m.district],
        href: `/markets/${m.id}`,
      },
    }));
  }, [matches, from]);

  const setDayAndReset = (d: number) => {
    setDay(d);
    setPage(1);
  };
  const setAreaAndReset = (a: string) => {
    setArea(a);
    setPage(1);
  };
  const setSortAndReset = (s: string) => {
    setSort(s);
    setPage(1);
  };
  const clearAll = () => {
    setDay(6);
    setArea('all');
    setSort('near');
    setPage(1);
    Notification.info({ title: 'Filters cleared', text: 'Showing every market open on Saturday.' });
  };
  const goToPage = (p: number) => {
    setPage(p);
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    listRef.current?.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-hand text-hand text-ink-muted">
          <time dateTime={now.toISOString()}>
            {weekday(now)} {pad(now.getDate())}/{pad(now.getMonth() + 1)} · {formatTime(now)}
          </time>{' '}
          · Ho Chi Minh City · {plural(matches.length)}
        </p>
        <h1 className="font-hand md:text-display my-2 text-[40px] leading-[46px]">Markets</h1>
        <p className="text-body-lg max-w-155">Pick the day you want to shop, then narrow it down to your area.</p>
      </div>

      <Card as="section" aria-label="Filter the markets" className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/*
           * A day no market anywhere opens on is shown struck through rather than hidden, so the week always reads the
           * same and nobody clicks into an empty result.
           */}
          <DayChips
            legend="Market day"
            name="market-day"
            value={String(day)}
            onChange={(v) => setDayAndReset(Number(v))}
            options={DAY_OPTIONS.map((d) => ({
              value: String(d.value),
              label: d.label,
              date: upcoming(d.value, now),
              disabled: openOn(d.value).length === 0,
            }))}
          />
          <Button variant="ghost" size="sm" onClick={clearAll} className="self-start">
            Clear all
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-8">
          <SelectField
            id="area"
            label="Area"
            value={area}
            onChange={(e) => setAreaAndReset(e.target.value)}
            options={[
              { value: 'all', label: `All areas (${onDay.length})` },
              ...areas.map((a) => ({
                value: a,
                label: `${a} (${onDay.filter((m) => m.district === a).length})`,
              })),
            ]}
            className="min-w-65"
          />
          <SelectField
            id="sort"
            label="Sort by"
            value={sort}
            onChange={(e) => setSortAndReset(e.target.value)}
            options={SORTS}
            className="min-w-52.5"
          />
        </div>
      </Card>

      <p className="text-body">
        {matches.length ? (
          <>
            <b>{plural(matches.length)}</b> open on {dayLabel(day)}
            {where}
          </>
        ) : (
          <>
            Nothing open on {dayLabel(day)}
            {where}
          </>
        )}
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div ref={listRef} className="flex flex-col gap-4">
          {view === 'error' ? (
            <LoadError
              noun="markets"
              alt={
                <>
                  the <Link to="/map">market map</Link> opens on its own page
                </>
              }
              onRetry={() => setOverride(null)}
            />
          ) : view === 'loading' || matches.length ? (
            <>
              <div className="flex flex-col gap-4">
                {view === 'loading' ? (
                  // As many placeholders as the page is about to hold, so nothing shifts when the markets land.
                  <MarketCardSkeleton count={slice.length || PAGE_SIZE} />
                ) : (
                  slice.map((m) => <MarketCard key={m.id} market={m} />)
                )}
              </div>
              {/* The pager stays put while the next page loads, so the button you just pressed does not vanish. */}
              {matches.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {pages > 1 ? (
                    <>
                      <span className="text-small text-ink-muted">
                        Showing {from + 1}–{from + slice.length} of {matches.length}
                      </span>
                      <Pagination page={currentPage} pages={pages} onChange={goToPage} />
                    </>
                  ) : (
                    <span className="text-small text-ink-muted">All {plural(matches.length)} on one page</span>
                  )}
                </div>
              )}
            </>
          ) : area !== 'all' ? (
            <DataState
              className="max-w-none flex-none"
              title={`No markets in ${area} on ${dayLabel(day)}`}
              text={`Across the whole city ${plural(onDay.length)} open that day. Widen the area, or pick another day.`}
              action={
                <Button variant="secondary" size="sm" onClick={() => setAreaAndReset('all')}>
                  Show all areas
                </Button>
              }
            />
          ) : (
            <DataState
              className="max-w-none flex-none"
              title={`No markets open on ${dayLabel(day)}`}
              text={`Saturday is the busiest day, with ${plural(openOn(6).length)} open.`}
              action={
                <Button variant="secondary" size="sm" onClick={() => setDayAndReset(6)}>
                  Show Saturday
                </Button>
              }
            />
          )}
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-20">
          <MarketMap label="Map of the markets that match" markers={mapMarkers} className="min-h-80 md:min-h-120" />
          <p className="text-caption text-ink-muted">
            The map follows the filters and shows only the markets in the list.
          </p>
        </div>
      </div>

      <section className="mt-2 flex flex-col gap-4">
        <h2 className="text-h3">Other states of this list (FR-084)</h2>
        {/* "With data" hands the list back to the real loading cycle rather than pinning it open. */}
        <div className="flex flex-wrap items-center gap-2">
          {VIEWS.map((v) => (
            <Chip
              key={v.value}
              pressed={view === v.value}
              onClick={() => setOverride(v.value === 'loaded' ? null : v.value)}
            >
              {v.label}
            </Chip>
          ))}
        </div>
        <p className="text-small text-ink-muted">
          The empty state is reachable for real: pick <b>Friday</b> and the area <b>Bình Thạnh</b>. It names what you
          chose and offers the way out.
        </p>
      </section>
    </div>
  );
};

export default MarketsPage;
