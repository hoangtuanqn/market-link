import { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
import useSettings from '@/hooks/useSettings';
import { markets } from '@/data/home';
import { dayList, dayName, formatClock, nowLabel, upcoming } from '@/lib/format';
import Notification from '@/utils/notification';

const PAGE_SIZE = 3;
/** All seven weekdays, Monday first, matching `market_operating_days.day_of_week` (0 = Sunday). */
const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0];
const SORTS = ['near', 'stalls', 'opens'] as const;
/** FR-084: the four states of this list. Empty is reachable for real, so it needs no demo switch. */
const VIEWS = ['loaded', 'loading', 'error'] as const;

type View = (typeof VIEWS)[number];

/**
 * How long the skeleton is held on the first visit and on every page change. The markets are still demo data in
 * `src/data/home.ts`, so there is nothing to wait for; this stands in for the request until `GET /api/markets` exists,
 * and the wait comes off when the page starts asking the server.
 */
const LOADING_MS = 1200;

const dayLabel = (dow: number) => dayName(dow, 'long');
const openOn = (dow: number) => markets.filter((m) => m.days.includes(dow));

/** FR-010 — browse markets by location and day. */
const MarketsPage = () => {
  const { t } = useTranslation('Markets');
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

  const { preferredMarket } = useSettings();
  const matches = useMemo(() => {
    const list = onDay.filter((m) => area === 'all' || m.district === area);
    return [...list].sort((a, b) => {
      // Settings → Market you shop at most: that market leads whatever the sort
      const pa = String(a.id) === preferredMarket ? 0 : 1;
      const pb = String(b.id) === preferredMarket ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (sort === 'stalls') return b.stalls - a.stalls;
      if (sort === 'opens') return a.open.localeCompare(b.open);
      return parseFloat(a.distance ?? '0') - parseFloat(b.distance ?? '0');
    });
  }, [onDay, area, sort, preferredMarket]);

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const slice = matches.slice(from, from + PAGE_SIZE);

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
        lines: [
          `${dayList(m.days)} · ${formatClock(m.open)}–${formatClock(m.close)}`,
          t('popupStalls', { count: m.stalls }),
          m.district,
        ],
        href: `/markets/${m.id}`,
      },
    }));
  }, [matches, from, t]);

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
    Notification.info({ title: t('cleared.title'), text: t('cleared.text', { day: dayLabel(6) }) });
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
          <time dateTime={now.toISOString()}>{nowLabel(now)}</time> · {t('city')} ·{' '}
          {t('count', { count: matches.length })}
        </p>
        <h1 className="font-hand md:text-display my-2 text-[40px] leading-[46px]">{t('title')}</h1>
        <p className="text-body-lg max-w-155">{t('intro')}</p>
      </div>

      <Card as="section" aria-label={t('filters.label')} className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/*
           * A day no market anywhere opens on is shown struck through rather than hidden, so the week always reads the
           * same and nobody clicks into an empty result.
           */}
          <DayChips
            legend={t('filters.day')}
            name="market-day"
            value={String(day)}
            onChange={(v) => setDayAndReset(Number(v))}
            options={DAY_OPTIONS.map((d) => ({
              value: String(d),
              label: dayLabel(d),
              date: upcoming(d, now),
              disabled: openOn(d).length === 0,
            }))}
          />
          <Button variant="ghost" size="sm" onClick={clearAll} className="self-start">
            {t('filters.clearAll')}
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-8">
          <SelectField
            id="area"
            label={t('filters.area')}
            value={area}
            onChange={(e) => setAreaAndReset(e.target.value)}
            options={[
              { value: 'all', label: t('filters.allAreas', { count: onDay.length }) },
              ...areas.map((a) => ({
                value: a,
                label: `${a} (${onDay.filter((m) => m.district === a).length})`,
              })),
            ]}
            className="min-w-65"
          />
          <SelectField
            id="sort"
            label={t('filters.sort')}
            value={sort}
            onChange={(e) => setSortAndReset(e.target.value)}
            options={SORTS.map((s) => ({ value: s, label: t(`sorts.${s}`) }))}
            className="min-w-52.5"
          />
        </div>
      </Card>

      <p className="text-body">
        {matches.length ? (
          <Trans
            t={t}
            i18nKey={area === 'all' ? 'summary.open' : 'summary.openIn'}
            count={matches.length}
            values={{ day: dayLabel(day), area }}
            components={{ b: <b /> }}
          />
        ) : area === 'all' ? (
          t('summary.none', { day: dayLabel(day) })
        ) : (
          t('summary.noneIn', { day: dayLabel(day), area })
        )}
      </p>

      {/* The list runs the full width like the filter card above it; the map sits below it, wide enough to read. */}
      <div className="flex flex-col gap-6">
        <div ref={listRef} className="flex flex-col gap-4">
          {view === 'error' ? (
            <LoadError
              noun={t('error.noun')}
              alt={<Trans t={t} i18nKey="error.alt" components={{ link: <Link to="/map" /> }} />}
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
                        {t('pager.showing', { from: from + 1, to: from + slice.length, total: matches.length })}
                      </span>
                      <Pagination page={currentPage} pages={pages} onChange={goToPage} />
                    </>
                  ) : (
                    <span className="text-small text-ink-muted">{t('pager.onePage', { count: matches.length })}</span>
                  )}
                </div>
              )}
            </>
          ) : area !== 'all' ? (
            <DataState
              className="max-w-none flex-none"
              title={t('empty.areaTitle', { area, day: dayLabel(day) })}
              text={t('empty.areaText', { count: onDay.length })}
              action={
                <Button variant="secondary" size="sm" onClick={() => setAreaAndReset('all')}>
                  {t('empty.allAreas')}
                </Button>
              }
            />
          ) : (
            <DataState
              className="max-w-none flex-none"
              title={t('empty.dayTitle', { day: dayLabel(day) })}
              text={t('empty.dayText', { day: dayLabel(6), count: openOn(6).length })}
              action={
                <Button variant="secondary" size="sm" onClick={() => setDayAndReset(6)}>
                  {t('empty.showDay', { day: dayLabel(6) })}
                </Button>
              }
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <MarketMap label={t('map.label')} markers={mapMarkers} className="min-h-100 md:min-h-155" />
          <p className="text-caption text-ink-muted">{t('map.note')}</p>
        </div>
      </div>

      <section className="mt-2 flex flex-col gap-4">
        <h2 className="text-h3">{t('demo.title')}</h2>
        {/* "With data" hands the list back to the real loading cycle rather than pinning it open. */}
        <div className="flex flex-wrap items-center gap-2">
          {VIEWS.map((v) => (
            <Chip key={v} pressed={view === v} onClick={() => setOverride(v === 'loaded' ? null : v)}>
              {t(`demo.views.${v}`)}
            </Chip>
          ))}
        </div>
        <p className="text-small text-ink-muted">
          <Trans
            t={t}
            i18nKey="demo.note"
            values={{ day: dayLabel(5), area: 'Bình Thạnh' }}
            components={{ b: <b /> }}
          />
        </p>
      </section>
    </div>
  );
};

export default MarketsPage;
