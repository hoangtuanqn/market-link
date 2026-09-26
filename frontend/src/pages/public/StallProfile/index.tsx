import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import CatalogApi from '@/api-requests/catalog.requests';
import ProductApi from '@/api-requests/product.requests';
import StallApi, { dayNames, pickupWindow, type StallMarketDto } from '@/api-requests/stall.requests';
import DayChips from '@/components/DayChips';
import DirectionsButton from '@/components/DirectionsButton';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import ProductCard from '@/components/ProductCard';
import Rating from '@/components/Rating';
import ReviewCard from '@/components/ReviewCard';
import { CheckIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { LoadError } from '@/components/ui/data-state';
import { Pagination } from '@/components/ui/pagination';
import Tabs from '@/components/ui/tabs';
import { Table } from '@/components/ui/table';
import { reviewTags, reviewsForFarmer } from '@/data/catalog';
import { demoTierOf } from '@/data/tiers';
import { SHOW_WIP } from '@/config/wip';
import useRequest from '@/hooks/useRequest';
import { dayName, formatClock, upcoming } from '@/lib/format';
import type { MarketType } from '@/types/market.types';
import type { ProductType } from '@/types/product.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const REVIEWS_PER_PAGE = 6;
/** Contract §3 caps a page at 50; every market of the city fits in one call. */
const FETCH_SIZE = 50;
const NO_MARKETS: MarketType[] = [];
const NO_PRODUCTS: ProductType[] = [];

/** The window a stall keeps at one market: earliest start to latest end across its days there. */
const windowOf = (m: StallMarketDto) => {
  const starts = m.operatingDays.map((d) => d.pickupStartTime).sort();
  const ends = m.operatingDays.map((d) => d.pickupEndTime).sort();
  return pickupWindow(starts[0], ends[ends.length - 1]);
};

/** FR-011 — a stall's profile: this week's stock, reviews, and where to collect. */
const StallProfilePage = () => {
  const { t } = useTranslation('StallProfile');
  const { t: tc } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const farmerId = Number(id);
  const validId = Number.isInteger(farmerId) && farmerId > 0;
  // Stalls waiting for approval or suspended have no public page: the server answers 404 (D-09).
  const { state: load, retry } = useRequest(`stall:${id}`, () =>
    validId ? StallApi.get(farmerId) : Promise.reject(new Error('missing')),
  );
  const missing = load.kind === 'error' && (!validId || Helper.getErrorCode(load.error) === 'NOT_FOUND');
  const stall = load.kind === 'ready' ? load.data : undefined;

  // Market coordinates and addresses, for the pins and the "where and when" table.
  const { state: marketsLoad } = useRequest('markets', () =>
    CatalogApi.listMarkets({ pageSize: FETCH_SIZE }).then((result) => result.items),
  );
  const allMarkets = marketsLoad.kind === 'ready' ? marketsLoad.data : NO_MARKETS;
  const marketById = (marketId: number) => allMarkets.find((m) => m.id === marketId);
  // This week's stock (FR-011); products are visible only while the stall is approved (D-09).
  const { state: productsLoad } = useRequest(`stall-products:${id}`, () =>
    validId ? ProductApi.byFarmer(farmerId) : Promise.resolve(NO_PRODUCTS),
  );

  const availableDays = stall
    ? [1, 2, 3, 4, 5, 6, 0].filter((d) => stall.markets.some((m) => m.operatingDays.some((od) => od.dayOfWeek === d)))
    : [];

  const [tab, setTab] = useState<'stock' | 'reviews' | 'about'>('stock');
  // Defaults to the stall's first selling day, not a fixed Saturday; null until the stall has arrived.
  const [pickedDay, setPickedDay] = useState<number | null>(null);
  const day = pickedDay ?? availableDays[0] ?? 6;
  const [reviewFilter, setReviewFilter] = useState<'all' | 'farmer' | 'product'>('all');
  const [reviewPage, setReviewPage] = useState(1);

  // The stall at each market it trades at, plus the markets themselves (FR-011, FR-012). Plain per-render work.
  const mapMarkers: MapMarker[] = [];
  if (stall) {
    stall.markets.forEach((sm) => {
      const m = marketById(sm.marketId);
      if (sm.stallLatitude != null && sm.stallLongitude != null) {
        mapMarkers.push({
          lat: Number(sm.stallLatitude),
          lng: Number(sm.stallLongitude),
          kind: 'stall',
          label: stall.stallName,
          selected: true,
          popup: {
            title: stall.stallName,
            lines: [tc('map.stallPickup', { code: sm.stallCode ?? '', pickup: windowOf(sm) })],
          },
        });
      }
      if (m) {
        mapMarkers.push({
          lat: m.lat,
          lng: m.lng,
          kind: 'market',
          label: m.name,
          popup: {
            title: m.name,
            lines: [`${formatClock(m.open)}–${formatClock(m.close)}`, m.address],
            href: `/markets/${m.id}`,
          },
        });
      }
    });
  }

  if (load.kind === 'loading') {
    return (
      <div className="flex flex-col gap-6">
        <MarketCardSkeleton count={1} />
      </div>
    );
  }

  if (load.kind === 'error' && !missing) {
    return <LoadError noun={t('error.noun')} onRetry={retry} />;
  }

  if (!stall) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('notFound.title')}</h1>
        <ButtonLink to="/markets">{t('notFound.browse')}</ButtonLink>
      </div>
    );
  }

  const rating = stall.ratingCount === 0 ? null : Number(stall.ratingAvg);
  const about = stall.description ?? '';
  const firstMarket = stall.markets[0];
  const firstWindow = firstMarket ? windowOf(firstMarket) : '';
  const days = dayNames(availableDays);
  const stallProducts = productsLoad.kind === 'ready' ? productsLoad.data : NO_PRODUCTS;
  // Reviews are still the demo set until C8; they follow the real stall id.
  const allReviews = SHOW_WIP ? reviewsForFarmer(stall.farmerId) : [];
  const filteredReviews = reviewFilter === 'all' ? allReviews : allReviews.filter((r) => r.targetType === reviewFilter);
  const reviewPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE));
  const reviewFrom = (Math.min(reviewPage, reviewPages) - 1) * REVIEWS_PER_PAGE;
  const shownReviews = filteredReviews.slice(reviewFrom, reviewFrom + REVIEWS_PER_PAGE);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/markets" className="text-brand underline">
          {t('breadcrumb')}
        </Link>{' '}
        {firstMarket && (
          <>
            ·{' '}
            <Link to={`/markets/${firstMarket.marketId}`} className="text-brand underline">
              {firstMarket.marketName}
            </Link>{' '}
          </>
        )}
        · {stall.stallName}
      </p>

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-start gap-4">
            <span
              aria-hidden="true"
              className="bg-brand text-on-brand font-hand grid size-16 flex-none place-items-center rounded-full text-[32px] uppercase"
            >
              {stall.stallName.charAt(0)}
            </span>
            <div className="flex flex-col gap-2">
              <h1 className="text-h1">{stall.stallName}</h1>
              <p className="text-body">
                {stall.contactPerson} {rating != null && <Rating value={rating} count={stall.ratingCount} />}
              </p>
              {about && <p className="font-hand text-hand max-w-155">&ldquo;{about}&rdquo;</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="bg-status-ready-bg text-status-ready-ink inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] font-bold">
              <CheckIcon size={14} />
              {t('approved')}
            </span>
            <div className="flex flex-wrap justify-end gap-2">
              {/* Favorites (FR-040) chưa có API: nút này chỉ hiện toast, nên production không hiện nó. */}
              {SHOW_WIP && (
                <Chip onClick={() => Notification.success({ text: t('savedToast', { name: stall.stallName }) })}>
                  {t('save')}
                </Chip>
              )}
              <ButtonLink to="/messages">{t('message')}</ButtonLink>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
            <b className="block text-[17px] tabular-nums">{rating ?? '—'}</b>
            <span className="text-ink-muted text-[12px]">{t('stats.reviews', { count: stall.ratingCount })}</span>
          </div>
          <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
            <b className="block text-[17px] tabular-nums">{stall.markets.length}</b>
            <span className="text-ink-muted text-[12px]">{t('stats.markets', { count: stall.markets.length })}</span>
          </div>
          <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
            <b className="block text-[17px] tabular-nums">{stall.orderCutoffHours}</b>
            <span className="text-ink-muted text-[12px]">{t('stats.cutoff')}</span>
          </div>
        </div>
      </Card>

      <Tabs
        label={t('tabs.label')}
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'stock', label: t('tabs.stock'), count: stallProducts.length },
          // Review còn là dữ liệu mẫu tới C8 → chỉ hiện ở dev (config/wip.ts).
          ...(SHOW_WIP ? [{ id: 'reviews', label: t('tabs.reviews'), count: allReviews.length }] : []),
          { id: 'about', label: t('tabs.about') },
        ]}
      />

      {tab === 'stock' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2">{t('tabs.stock')}</h2>
            <span className="text-small text-ink-muted">{t('stock.count', { count: stallProducts.length })}</span>
          </div>
          <DayChips
            legend={t('stock.availableOn')}
            name="stall-day"
            value={String(day)}
            onChange={(v) => setPickedDay(Number(v))}
            options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({
              value: String(d),
              label: dayName(d, 'long'),
              date: upcoming(d),
              disabled: !availableDays.includes(d),
            }))}
          />
          {productsLoad.kind === 'loading' ? (
            <MarketCardSkeleton count={3} />
          ) : (
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {stallProducts.map((p) => (
                <ProductCard key={p.id} product={p} showMarket={false} />
              ))}
            </div>
          )}
          {!availableDays.includes(day) && (
            <p className="text-small text-ink-muted">
              {t('stock.notSelling', { stall: stall.stallName, day: dayName(day, 'long'), days })}
            </p>
          )}
        </div>
      )}

      {SHOW_WIP && tab === 'reviews' && (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-baseline gap-3">
              <b className="font-hand text-[48px] leading-none tabular-nums">{rating ?? '—'}</b>
              {rating != null && <Rating value={rating} />}
              <span className="text-small text-ink-muted">{t('reviews.summary', { count: stall.ratingCount })}</span>
            </div>
            {reviewTags[stall.farmerId] && (
              <div className="flex flex-wrap gap-2">
                {reviewTags[stall.farmerId].map(([tag, count]) => (
                  <span
                    key={tag}
                    className="bg-brand-tint text-ink inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px]"
                  >
                    {tag} <b className="tabular-nums">{count}</b>
                  </span>
                ))}
              </div>
            )}
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Chip
                pressed={reviewFilter === 'all'}
                onClick={() => {
                  setReviewFilter('all');
                  setReviewPage(1);
                }}
              >
                {t('reviews.all')} <span className="text-[12px] tabular-nums opacity-80">{allReviews.length}</span>
              </Chip>
              <Chip
                pressed={reviewFilter === 'farmer'}
                onClick={() => {
                  setReviewFilter('farmer');
                  setReviewPage(1);
                }}
              >
                {t('reviews.farmer')}{' '}
                <span className="text-[12px] tabular-nums opacity-80">
                  {allReviews.filter((r) => r.targetType === 'farmer').length}
                </span>
              </Chip>
              <Chip
                pressed={reviewFilter === 'product'}
                onClick={() => {
                  setReviewFilter('product');
                  setReviewPage(1);
                }}
              >
                {t('reviews.product')}{' '}
                <span className="text-[12px] tabular-nums opacity-80">
                  {allReviews.filter((r) => r.targetType === 'product').length}
                </span>
              </Chip>
            </div>
            <span className="text-small text-ink-muted">{t('reviews.newest')}</span>
          </div>

          <div className="flex flex-col gap-4">
            {shownReviews.map((r) => (
              <ReviewCard
                key={r.id}
                author={r.author}
                authorTier={demoTierOf(r.author)}
                date={r.date}
                target={r.target}
                rating={r.rating}
                text={r.text}
                reply={r.reply}
                fluid
              />
            ))}
          </div>
          {reviewPages > 1 && (
            <Pagination page={Math.min(reviewPage, reviewPages)} pages={reviewPages} onChange={setReviewPage} />
          )}
        </div>
      )}

      {tab === 'about' && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-3">
              <h2 className="text-h2">{t('about.whereWhen')}</h2>
              <Table
                columns={[
                  {
                    key: 'market',
                    label: t('about.table.market'),
                    render: (row: StallMarketDto) => (
                      <>
                        <b>{row.marketName}</b>
                        <span className="text-ink-muted mt-0.5 block text-[12px]">
                          {marketById(row.marketId)?.address}
                        </span>
                      </>
                    ),
                  },
                  {
                    key: 'days',
                    label: t('about.table.days'),
                    render: (row: StallMarketDto) => dayNames(row.operatingDays.map((d) => d.dayOfWeek)),
                  },
                  { key: 'window', label: t('about.table.window'), render: (row: StallMarketDto) => windowOf(row) },
                  { key: 'stall', label: t('about.table.stall'), render: (row: StallMarketDto) => row.stallCode ?? '' },
                  {
                    key: 'dir',
                    label: '',
                    align: 'actions',
                    render: (row: StallMarketDto) => {
                      const m = marketById(row.marketId);
                      const lat = row.stallLatitude != null ? Number(row.stallLatitude) : m?.lat;
                      const lng = row.stallLongitude != null ? Number(row.stallLongitude) : m?.lng;
                      return lat != null && lng != null ? (
                        <DirectionsButton to={{ lat, lng }} name={stall.stallName} />
                      ) : null;
                    },
                  },
                ]}
                rows={stall.markets}
              />
              <p className="text-small text-ink-muted">{t('about.cutoffNote', { count: stall.orderCutoffHours })}</p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-h2">{t('tabs.about')}</h2>
              {about && <p className="text-body max-w-155">{about}</p>}
              <p className="text-body max-w-155">{t('about.disclaimer')}</p>
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                <dt className="text-ink-muted">{t('about.contact')}</dt>
                <dd className="m-0">{stall.contactPerson}</dd>
              </dl>
            </section>
          </div>

          <div className="flex flex-col gap-4">
            <MarketMap
              label={t('about.mapLabel', { name: stall.stallName })}
              markers={mapMarkers}
              className="min-h-72"
            />
            {firstMarket && (
              <Card className="flex flex-col gap-2 p-4">
                <h3 className="text-h3">{t('about.findingTitle')}</h3>
                <p className="text-small">
                  {t('about.findingText', { code: firstMarket.stallCode ?? '', window: firstWindow })}
                </p>
                <ButtonLink to={`/markets/${firstMarket.marketId}`} variant="secondary" size="sm">
                  {t('about.preorder')}
                </ButtonLink>
              </Card>
            )}
          </div>
        </div>
      )}

      <p className="text-small">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => Notification.success({ title: t('report.sentTitle'), text: t('report.sentText') })}
        >
          {t('report.button')}
        </Button>{' '}
        <span className="text-ink-muted">{t('report.note')}</span>
      </p>
    </div>
  );
};

export default StallProfilePage;
