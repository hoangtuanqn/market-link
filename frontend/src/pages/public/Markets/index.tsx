import { useCallback, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import CatalogApi from '@/api-requests/catalog.requests';
import DayChips from '@/components/DayChips';
import MarketCard from '@/components/MarketCard';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import { SelectField } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import useClock from '@/hooks/useClock';
import useGeolocation from '@/hooks/useGeolocation';
import useRequest from '@/hooks/useRequest';
import useSettings from '@/hooks/useSettings';
import { dayList, dayName, firstOpenDay, formatClock, formatDayMonth, nextSevenDays, nowLabel } from '@/lib/format';
import { distanceKm } from '@/lib/geo';
import type { MarketType } from '@/types/market.types';
import Notification from '@/utils/notification';

const PAGE_SIZE = 3;
const SORTS = ['near', 'stalls', 'opens'] as const;
const FETCH_SIZE = 50;
const NO_MARKETS: MarketType[] = [];

const dayLabel = (dow: number) => dayName(dow, 'long');

const MarketsPage = () => {
  const { t } = useTranslation('Markets');
  const { t: tc } = useTranslation();
  const now = useClock();
  const [picked, setPicked] = useState<number | null>(null);
  const [area, setArea] = useState('all');
  const [sort, setSort] = useState('stalls');
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);
  const { state: geo, request: askLocation, clear: forgetLocation } = useGeolocation();
  const here = geo.status === 'ready' ? geo.at : null;

  const { state: load, retry } = useRequest('markets', () =>
    CatalogApi.listMarkets({ pageSize: FETCH_SIZE }).then((result) => result.items),
  );
  const all = load.kind === 'ready' ? load.data : NO_MARKETS;
  const openOn = useCallback((dow: number) => all.filter((m) => m.days.includes(dow)), [all]);
  const week = nextSevenDays(now);
  const defaultDay = firstOpenDay((d) => openOn(d).length > 0, now);
  const day = picked ?? defaultDay;

  const onDay = useMemo(() => openOn(day), [openOn, day]);
  const areas = useMemo(
    () => [...new Set(all.map((m) => m.area).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [all],
  );

  const distances = useMemo(() => {
    if (!here) return new Map<number, number>();
    return new Map(all.map((m) => [m.id, distanceKm(here, { lat: m.lat, lng: m.lng })]));
  }, [here, all]);

  const { preferredMarket } = useSettings();
  const matches = useMemo(() => {
    const list = onDay.filter((m) => area === 'all' || m.area === area);
    return [...list].sort((a, b) => {
      const pa = String(a.id) === preferredMarket ? 0 : 1;
      const pb = String(b.id) === preferredMarket ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (sort === 'stalls') return b.stalls - a.stalls;
      if (sort === 'opens') return a.open.localeCompare(b.open);
      return (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity);
    });
  }, [onDay, area, sort, preferredMarket, distances]);

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const slice = matches.slice(from, from + PAGE_SIZE);

  const mapMarkers = useMemo<MapMarker[]>(() => {
    const shown = matches.length ? matches : all;
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
          m.area,
        ],
        href: `/markets/${m.id}`,
      },
    }));
  }, [matches, all, from, t]);

  const setDayAndReset = (d: number) => {
    setPicked(d);
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
    setPicked(null);
    setArea('all');
    setSort('stalls');
    setPage(1);
    Notification.info({ title: t('cleared.title'), text: t('cleared.text', { day: dayLabel(defaultDay) }) });
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
          <DayChips
            legend={t('filters.day')}
            name="market-day"
            value={String(day)}
            onChange={(v) => setDayAndReset(Number(v))}
            options={week.map((d) => ({
              value: String(d.dow),
              label: dayLabel(d.dow),
              date: formatDayMonth(d.date),
              disabled: load.kind === 'ready' && openOn(d.dow).length === 0,
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
                label: `${a} (${onDay.filter((m) => m.area === a).length})`,
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

        <div className="border-line flex flex-wrap items-center gap-3 border-t pt-3">
          {here ? (
            <>
              <span className="text-small">{t('location.measured')}</span>
              <Button variant="ghost" size="sm" onClick={forgetLocation}>
                {t('location.forget')}
              </Button>
            </>
          ) : (
            <>
              <span className="text-small text-ink-muted">
                {geo.status === 'denied'
                  ? t('location.denied')
                  : geo.status === 'unavailable'
                    ? tc(`geo.${geo.reason}`)
                    : sort === 'near'
                      ? t('location.needed')
                      : t('location.share')}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={askLocation}
                disabled={geo.status === 'asking' || geo.status === 'denied' || geo.status === 'unavailable'}
              >
                {geo.status === 'asking' ? tc('geo.finding') : t('location.use')}
              </Button>
            </>
          )}
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div ref={listRef} className="flex flex-col gap-4">
          {load.kind === 'error' ? (
            <LoadError
              noun={t('error.noun')}
              alt={<Trans t={t} i18nKey="error.alt" components={{ a: <Link to="/map" /> }} />}
              onRetry={retry}
            />
          ) : load.kind === 'loading' || matches.length ? (
            <>
              <div className="flex flex-col gap-4">
                {load.kind === 'loading' ? (
                  <MarketCardSkeleton count={PAGE_SIZE} />
                ) : (
                  slice.map((m) => <MarketCard key={m.id} market={m} distanceKm={distances.get(m.id)} />)
                )}
              </div>
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

        <div className="flex flex-col gap-4 lg:sticky lg:top-20">
          <MarketMap label={t('map.label')} markers={mapMarkers} className="min-h-80 md:min-h-120" />
          <p className="text-caption text-ink-muted">{t('map.note')}</p>
        </div>
      </div>
    </div>
  );
};

export default MarketsPage;
