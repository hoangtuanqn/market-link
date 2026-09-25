import { useState } from 'react';
import { Link, useParams } from 'react-router';
import DayChips from '@/components/DayChips';
import MapPlaceholder from '@/components/MapPlaceholder';
import ProductCard from '@/components/ProductCard';
import Rating from '@/components/Rating';
import ReviewCard from '@/components/ReviewCard';
import { CheckIcon } from '@/components/icons';
import { Button, ButtonAnchor, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Pagination } from '@/components/ui/pagination';
import Tabs from '@/components/ui/tabs';
import { Table } from '@/components/ui/table';
import { farmer, marketName, products, reviewTags, reviewsForFarmer } from '@/data/catalog';
import { markets } from '@/data/home';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const DOW_ABBR: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
const REVIEWS_PER_PAGE = 6;

/** FR-011 — a stall's profile: this week's stock, reviews, and where to collect. */
const StallProfilePage = () => {
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

  if (!f) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">That stall is not here any more</h1>
        <ButtonLink to="/markets">Browse markets</ButtonLink>
      </div>
    );
  }

  const stallProducts = products.filter((p) => p.farmerId === f.id);

  const allReviews = reviewsForFarmer(f.id);
  const filteredReviews = reviewFilter === 'all' ? allReviews : allReviews.filter((r) => r.targetType === reviewFilter);
  const reviewPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE));
  const reviewFrom = (Math.min(reviewPage, reviewPages) - 1) * REVIEWS_PER_PAGE;
  const shownReviews = filteredReviews.slice(reviewFrom, reviewFrom + REVIEWS_PER_PAGE);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/markets" className="text-brand underline">
          Markets
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
                Approved stall
              </span>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Chip onClick={() => Notification.success({ text: `Saved ${f.stall}.` })}>Save stall</Chip>
              <ButtonLink to="/messages">Message the stall</ButtonLink>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
            <b className="block text-[17px] tabular-nums">{f.rating ?? '—'}</b>
            <span className="text-ink-muted text-[12px]">{f.reviews} reviews</span>
          </div>
          <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
            <b className="block text-[17px] tabular-nums">{f.markets.length}</b>
            <span className="text-ink-muted text-[12px]">markets</span>
          </div>
          <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
            <b className="block text-[17px] tabular-nums">{f.registered}</b>
            <span className="text-ink-muted text-[12px]">selling here since</span>
          </div>
        </div>
      </Card>

      <Tabs
        label="Stall sections"
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'stock', label: "This week's stock", count: stallProducts.length },
          { id: 'reviews', label: 'Reviews', count: allReviews.length },
          { id: 'about', label: 'About the stall' },
        ]}
      />

      {tab === 'stock' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2">This week&apos;s stock</h2>
            <span className="text-small text-ink-muted">{stallProducts.length} products</span>
          </div>
          <DayChips
            legend="Available on"
            name="stall-day"
            value={String(day)}
            onChange={(v) => setDay(Number(v))}
            options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({
              value: String(d),
              label: DOW_ABBR[d],
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
              {f.stall} does not sell on {DOW_ABBR[day]}. Products above are what they carry on their selling days (
              {f.days}).
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
              <span className="text-small text-ink-muted">{f.reviews} reviews, every one from a completed order</span>
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
                All <span className="text-[12px] tabular-nums opacity-80">{allReviews.length}</span>
              </Chip>
              <Chip
                pressed={reviewFilter === 'farmer'}
                onClick={() => {
                  setReviewFilter('farmer');
                  setReviewPage(1);
                }}
              >
                About the stall{' '}
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
                About products{' '}
                <span className="text-[12px] tabular-nums opacity-80">
                  {allReviews.filter((r) => r.targetType === 'product').length}
                </span>
              </Chip>
            </div>
            <span className="text-small text-ink-muted">Newest first</span>
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
              <h2 className="text-h2">Where and when</h2>
              <Table
                columns={[
                  {
                    key: 'market',
                    label: 'Market',
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
                  { key: 'days', label: 'Days', render: () => f.days },
                  { key: 'window', label: 'Pickup window', render: () => f.pickup },
                  { key: 'stall', label: 'Stall', render: () => f.stallCode },
                  {
                    key: 'dir',
                    label: '',
                    align: 'actions',
                    render: (row: { id: number }) => {
                      const m = markets.find((mm) => mm.id === row.id)!;
                      return (
                        <ButtonAnchor href={Helper.directionsUrl(m.lat, m.lng)} variant="ghost" size="sm">
                          Directions
                        </ButtonAnchor>
                      );
                    },
                  },
                ]}
                rows={f.markets.map((id) => ({ id }))}
              />
              <p className="text-small text-ink-muted">
                Orders close {f.cutoffHours} hours before the slot you choose. After that only the stall can change the
                order.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-h2">About the stall</h2>
              <p className="text-body max-w-155">{f.about}</p>
              <p className="text-body max-w-155">
                MarketLink does not check licences or organic claims. If that matters to you, ask at the stall.
              </p>
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                <dt className="text-ink-muted">Contact</dt>
                <dd className="m-0">
                  {f.person} · {f.phone}
                </dd>
                <dt className="text-ink-muted">Email</dt>
                <dd className="m-0">{f.email}</dd>
                <dt className="text-ink-muted">Selling here since</dt>
                <dd className="m-0">{f.registered}</dd>
              </dl>
            </section>
          </div>

          <div className="flex flex-col gap-4">
            <MapPlaceholder label={`Map of ${f.stall}`} />
            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-h3">Finding the stall</h3>
              <p className="text-small">
                Stall {f.stallCode} · pickup window {f.pickup}. Slots are 30 minutes and hold 5 orders each.
              </p>
              <ButtonLink to={`/markets/${f.markets[0]}`} variant="secondary" size="sm">
                Pre-order at this market
              </ButtonLink>
            </Card>
          </div>
        </div>
      )}

      <p className="text-small">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => Notification.success({ title: 'Report sent', text: 'An admin will look into it.' })}
        >
          Report this stall
        </Button>{' '}
        <span className="text-ink-muted">
          Repeated no-shows, wrong stall location, or anything that breaks the platform guidelines.
        </span>
      </p>
    </div>
  );
};

export default StallProfilePage;
