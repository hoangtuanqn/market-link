import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CatalogApi from '@/api-requests/catalog.requests';
import StallApi, { toStallCard, type StallCardData } from '@/api-requests/stall.requests';
import DayChips from '@/components/DayChips';
import MarketCard from '@/components/MarketCard';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import { dayList, dayName, firstOpenDay, formatClock, formatDayMonth, nextSevenDays } from '@/lib/format';
import type { MarketType } from '@/types/market.types';

/** Contract §3 caps a page at 50; every market of the city fits in one call. */
const FETCH_SIZE = 50;
const NO_MARKETS: MarketType[] = [];
const NO_STALLS: StallCardData[] = [];

/** FR-012 FR-013 — every market and its approved stalls on the map, for the day you choose. */
const MarketMapPage = () => {
  const { t } = useTranslation('MarketMap');
  // The coming week from today; labels come from format.ts so they follow the language and date order.
  const [week] = useState(() => nextSevenDays());
  const [picked, setPicked] = useState<number | null>(null);
  const [showMarkets, setShowMarkets] = useState(true);
  const [showStalls, setShowStalls] = useState(true);

  const { state: load, retry } = useRequest('markets', () =>
    CatalogApi.listMarkets({ pageSize: FETCH_SIZE }).then((result) => result.items),
  );
  const all = load.kind === 'ready' ? load.data : NO_MARKETS;

  const anyOpen = (d: number) => all.some((m) => m.days.includes(d));
  /** Until a chip is picked: the first day from today that some market opens on. */
  const dow = picked ?? (load.kind === 'ready' ? firstOpenDay(anyOpen, week[0].date) : week[0].dow);
  const openMarkets = useMemo(() => all.filter((m) => m.days.includes(dow)), [all, dow]);

  // A stall is only on the map for a day it actually trades: one request per market open that day (≤ a handful),
  // keyed by day and market list so a new chip or freshly loaded markets start a new round.
  const openMarketKey = openMarkets.map((m) => m.id).join(',');
  const { state: stallsLoad, retry: retryStalls } = useRequest(`map-stalls:${dow}:${openMarketKey}`, () =>
    Promise.all(
      openMarkets.map((m) =>
        StallApi.atMarket(m.id, dow).then((list) => list.map((s) => toStallCard(s, m.id, m.name))),
      ),
    ).then((lists) => lists.flat()),
  );
  const openStalls = stallsLoad.kind === 'ready' ? stallsLoad.data : NO_STALLS;

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
            lines: [
              `${dayList(m.days)} · ${formatClock(m.open)}–${formatClock(m.close)}`,
              t('popup.stalls', { count: m.stalls }),
            ],
            href: `/markets/${m.id}`,
          },
        })),
      );
    if (showStalls)
      out.push(
        ...openStalls
          .filter((f) => f.lat != null && f.lng != null)
          .map((f) => ({
            lat: f.lat!,
            lng: f.lng!,
            kind: 'stall' as const,
            popup: {
              title: f.stall,
              lines: [t('popup.pickup', { days: f.days, pickup: f.pickup })],
              href: `/stalls/${f.id}`,
            },
          })),
      );
    return out;
  }, [openMarkets, openStalls, showMarkets, showStalls, t]);

  const pickedDate = week.find((d) => d.dow === dow)?.date;
  const pickedName = dayName(dow, 'long');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">
            {pickedName} {pickedDate && formatDayMonth(pickedDate)}
          </p>
          <h1 className="font-hand md:text-display text-h1">{t('title')}</h1>
          <p className="text-body-lg max-w-160">{t('intro')}</p>
        </div>
        <DayChips
          legend={t('marketDay')}
          name="map-day"
          options={week.map((d) => ({
            value: String(d.dow),
            label: dayName(d.dow, 'long'),
            date: formatDayMonth(d.date),
            // A day no market opens on is struck through, as on the markets list.
            disabled: load.kind === 'ready' && !anyOpen(d.dow),
          }))}
          value={String(dow)}
          onChange={(v) => setPicked(Number(v))}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Chip pressed={showMarkets} onClick={() => setShowMarkets((v) => !v)}>
            {t('filter.markets')}
          </Chip>
          <Chip pressed={showStalls} onClick={() => setShowStalls((v) => !v)}>
            {t('filter.stalls')}
          </Chip>
        </div>
        <div className="text-small text-ink-muted flex flex-wrap gap-4">
          <span>{t('legend.market')}</span>
          <span>{t('legend.stall')}</span>
          <span>{t('legend.selected')}</span>
        </div>
      </div>

      {load.kind === 'error' ? (
        <LoadError noun={t('error.noun')} onRetry={retry} />
      ) : !showMarkets && !showStalls ? (
        <DataState
          title={t('bothOff.title')}
          text={t('bothOff.text')}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowMarkets(true);
                setShowStalls(true);
              }}
            >
              {t('bothOff.action')}
            </Button>
          }
        />
      ) : (
        <MarketMap label={t('mapLabel')} markers={markers} className="min-h-100 md:min-h-155" />
      )}
      <p className="text-small text-ink-muted">{t('directions')}</p>
      {stallsLoad.kind === 'error' && <LoadError noun={t('stallsNoun')} onRetry={retryStalls} />}

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">{t('openOn', { day: pickedName })}</h2>
        {load.kind === 'loading' ? (
          <MarketCardSkeleton count={2} />
        ) : load.kind === 'error' ? null : openMarkets.length ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {openMarkets.map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        ) : (
          <DataState title={t('empty.title')} text={t('empty.text')} />
        )}
      </section>
    </div>
  );
};

export default MarketMapPage;
