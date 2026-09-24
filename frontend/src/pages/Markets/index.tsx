import { useMemo, useState } from 'react';
import DayChips from '@/components/DayChips';
import MapPlaceholder from '@/components/MapPlaceholder';
import MarketCard from '@/components/MarketCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState } from '@/components/ui/data-state';
import { SelectField } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import useClock from '@/hooks/useClock';
import { markets } from '@/data/home';
import { formatTime, weekday } from '@/lib/format';
import Notification from '@/utils/notification';

const PAGE_SIZE = 3;
const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];
const SORTS = [
  { value: 'near', label: 'Nearest first' },
  { value: 'stalls', label: 'Most stalls' },
  { value: 'opens', label: 'Opens earliest' },
];

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

  const onDay = useMemo(() => openOn(day), [day]);
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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="font-hand text-hand text-ink-muted">
          <time dateTime={now.toISOString()}>
            {weekday(now)} {pad(now.getDate())}/{pad(now.getMonth() + 1)} · {formatTime(now)}
          </time>{' '}
          · Ho Chi Minh City · {plural(matches.length)}
        </p>
        <h1 className="text-h1">Markets</h1>
        <p className="text-body-lg max-w-155">Pick the day you want to shop, then narrow it down to your area.</p>
      </div>

      <Card className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <DayChips
            legend="Market day"
            name="market-day"
            value={String(day)}
            onChange={(v) => setDayAndReset(Number(v))}
            options={DAY_OPTIONS.map((d) => ({
              value: String(d.value),
              label: d.label,
              disabled: openOn(d.value).length === 0,
            }))}
          />
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        </div>
        <div className="flex flex-wrap gap-6">
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
        <div className="flex flex-col gap-4">
          {matches.length ? (
            <>
              <div className="flex flex-col gap-4">
                {slice.map((m) => (
                  <MarketCard key={m.id} market={m} />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                {pages > 1 ? (
                  <>
                    <span className="text-small text-ink-muted">
                      Showing {from + 1}–{from + slice.length} of {matches.length}
                    </span>
                    <Pagination page={currentPage} pages={pages} onChange={setPage} />
                  </>
                ) : (
                  <span className="text-small text-ink-muted">All {plural(matches.length)} on one page</span>
                )}
              </div>
            </>
          ) : area !== 'all' ? (
            <DataState
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

        <div className="sticky top-20 flex flex-col gap-2">
          <MapPlaceholder label="Map of the markets that match" />
          <p className="text-ink-muted text-[13px]">
            The map follows the filters and shows only the markets in the list.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MarketsPage;
