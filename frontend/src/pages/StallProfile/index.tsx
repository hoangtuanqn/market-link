import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import DayChips from '@/components/DayChips';
import DirectionsButton from '@/components/DirectionsButton';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import ProductCard from '@/components/ProductCard';
import Rating from '@/components/Rating';
import ReviewCard from '@/components/ReviewCard';
import { CheckIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Pagination } from '@/components/ui/pagination';
import Tabs from '@/components/ui/tabs';
import { Table } from '@/components/ui/table';
import { farmer, marketName, products, reviewTags, reviewsForFarmer } from '@/data/catalog';
import { markets } from '@/data/home';
import { dayList, dayName, formatClock, formatDate } from '@/lib/format';
import Notification from '@/utils/notification';

/** How the demo data spells a stall's selling days ("Sat, Sun"); used to match, never shown. */
const DOW_ABBR: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
/** The demo window "06:00 – 10:30" and date "02/08/2026", shown through format.ts (clock and date settings). */
const pickupWindow = (pickup: string) =>
  pickup
    .split('–')
    .map((s) => formatClock(s.trim()))
    .join(' – ');
const dmy = (s: string) => {
  const [d, m, y] = s.split('/').map(Number);
  return y ? formatDate(new Date(y, m - 1, d)) : s;
};
const REVIEWS_PER_PAGE = 6;

/** FR-011 — a stall's profile: this week's stock, reviews, and where to collect. */
const StallProfilePage = () => {
  const { t } = useTranslation('StallProfile');
  const { t: tc } = useTranslation();
  const { id } = useParams<{ id: string }>();
  // Gian hàng chờ duyệt / bị đình chỉ không có trang công khai (trang Products cũng chỉ hiện gian đã duyệt)
  const found = farmer(Number(id));
  const f = found?.approval === 'approved' ? found : undefined;
  const availableDays = f ? [1, 2, 3, 4, 5, 6, 0].filter((d) => f.days.split(', ').includes(DOW_ABBR[d])) : [];

  const [tab, setTab] = useState<'stock' | 'reviews' | 'about'>('stock');
  // Mặc định chọn ngày bán đầu tiên của gian hàng, không cố định Thứ 7
  const [day, setDay] = useState(availableDays[0] ?? 6);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'farmer' | 'product'>('all');
  const [reviewPage, setReviewPage] = useState(1);

  // The stall itself, plus each market it trades at, so "where do I collect" is answerable at a glance (FR-011).
  // Plain per-render work: a handful of pins, and React Compiler cannot keep a manual memo over the module-level data.
  const mapMarkers: MapMarker[] = [];
  if (f) {
    const pins = mapMarkers;
    if (f.lat != null && f.lng != null) {
      pins.push({
        lat: f.lat,
        lng: f.lng,
        kind: 'stall',
        label: f.stall,
        selected: true,
        popup: { title: f.stall, lines: [tc('map.stallPickup', { code: f.stallCode, pickup: f.pickup })] },
      });
    }
    f.markets.forEach((id) => {
      const m = markets.find((mm) => mm.id === id);
      if (!m) return;
      pins.push({
        lat: m.lat,
        lng: m.lng,
        kind: 'market',
        label: m.name,
        popup: {
          title: m.name,
          lines: [`${formatClock(m.open)}\u2013${formatClock(m.close)}`, m.address],
          href: `/markets/${m.id}`,
        },
      });
    });
  }

  if (!f) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('notFound.title')}</h1>
        <ButtonLink to="/markets">{t('notFound.browse')}</ButtonLink>
      </div>
    );
  }

  const stallProducts = products.filter((p) => p.farmerId === f.id);
  const days = dayList(availableDays);
  const pickup = pickupWindow(f.pickup);
  const since = dmy(f.registered);

  const allReviews = reviewsForFarmer(f.id);
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
        ·{' '}
        <Link to={`/markets/${f.markets[0]}`} className="text-brand underline">
          {marketName(f.markets[0])}
        </Link>{' '}
        · {f.stall}
      </p>

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-start gap-4">
            <span
              aria-hidden="true"
              className="bg-brand text-on-brand font-hand grid size-16 flex-none place-items-center rounded-full text-[32px] uppercase"
            >
              {f.stall.charAt(0)}
            </span>
            <div className="flex flex-col gap-2">
              <h1 className="text-h1">{f.stall}</h1>
              <p className="text-body">
                {f.person} {f.rating != null && <Rating value={f.rating} count={f.reviews} />}
              </p>
              <p className="font-hand text-hand max-w-155">&ldquo;{f.about}&rdquo;</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {f.approval === 'approved' && (
              <span className="bg-status-ready-bg text-status-ready-ink inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] font-bold">
                <CheckIcon size={14} />
                {t('approved')}
              </span>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Chip onClick={() => Notification.success({ text: t('savedToast', { name: f.stall }) })}>
                {t('save')}
              </Chip>
              <ButtonLink to="/messages">{t('message')}</ButtonLink>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
            <b className="block text-[17px] tabular-nums">{f.rating ?? '—'}</b>
            <span className="text-ink-muted text-[12px]">{t('stats.reviews', { count: f.reviews })}</span>
          </div>
          <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
            <b className="block text-[17px] tabular-nums">{f.markets.length}</b>
            <span className="text-ink-muted text-[12px]">{t('stats.markets', { count: f.markets.length })}</span>
          </div>
          <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
            <b className="block text-[17px] tabular-nums">{since}</b>
            <span className="text-ink-muted text-[12px]">{t('stats.since')}</span>
          </div>
        </div>
      </Card>

      <Tabs
        label={t('tabs.label')}
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'stock', label: t('tabs.stock'), count: stallProducts.length },
          { id: 'reviews', label: t('tabs.reviews'), count: allReviews.length },
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
            onChange={(v) => setDay(Number(v))}
            options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({
              value: String(d),
              label: dayName(d),
              disabled: !availableDays.includes(d),
            }))}
          />
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {stallProducts.map((p) => (
              <ProductCard key={p.id} product={p} showMarket={false} />
            ))}
          </div>
          {!availableDays.includes(day) && (
            <p className="text-small text-ink-muted">
              {t('stock.notSelling', { stall: f.stall, day: dayName(day, 'long'), days })}
            </p>
          )}
        </div>
      )}

      {tab === 'reviews' && (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-baseline gap-3">
              <b className="font-hand text-[48px] leading-none tabular-nums">{f.rating ?? '—'}</b>
              {f.rating != null && <Rating value={f.rating} />}
              <span className="text-small text-ink-muted">{t('reviews.summary', { count: f.reviews })}</span>
            </div>
            {reviewTags[f.id] && (
              <div className="flex flex-wrap gap-2">
                {reviewTags[f.id].map(([tag, count]) => (
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
                    render: (row: { id: number }) => {
                      const m = markets.find((mm) => mm.id === row.id)!;
                      return (
                        <>
                          <b>{m.name}</b>
                          <span className="text-ink-muted mt-0.5 block text-[12px]">{m.address}</span>
                        </>
                      );
                    },
                  },
                  { key: 'days', label: t('about.table.days'), render: () => days },
                  { key: 'window', label: t('about.table.window'), render: () => pickup },
                  { key: 'stall', label: t('about.table.stall'), render: () => f.stallCode },
                  {
                    key: 'dir',
                    label: '',
                    align: 'actions',
                    render: (row: { id: number }) => {
                      const m = markets.find((mm) => mm.id === row.id)!;
                      return <DirectionsButton to={{ lat: m.lat, lng: m.lng }} name={m.name} />;
                    },
                  },
                ]}
                rows={f.markets.map((id) => ({ id }))}
              />
              <p className="text-small text-ink-muted">{t('about.cutoffNote', { count: f.cutoffHours })}</p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-h2">{t('tabs.about')}</h2>
              <p className="text-body max-w-155">{f.about}</p>
              <p className="text-body max-w-155">{t('about.disclaimer')}</p>
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                <dt className="text-ink-muted">{t('about.contact')}</dt>
                <dd className="m-0">
                  {f.person} · {f.phone}
                </dd>
                <dt className="text-ink-muted">{t('about.email')}</dt>
                <dd className="m-0">{f.email}</dd>
                <dt className="text-ink-muted">{t('about.since')}</dt>
                <dd className="m-0">{since}</dd>
              </dl>
            </section>
          </div>

          <div className="flex flex-col gap-4">
            <MarketMap label={t('about.mapLabel', { name: f.stall })} markers={mapMarkers} className="min-h-72" />
            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-h3">{t('about.findingTitle')}</h3>
              <p className="text-small">{t('about.findingText', { code: f.stallCode, window: pickup })}</p>
              <ButtonLink to={`/markets/${f.markets[0]}`} variant="secondary" size="sm">
                {t('about.preorder')}
              </ButtonLink>
            </Card>
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
