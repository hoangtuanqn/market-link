import { useState } from 'react';
import { Link, useParams } from 'react-router';
import FavoriteButton from '@/components/FavoriteButton';
import MapPlaceholder from '@/components/MapPlaceholder';
import ProductCard from '@/components/ProductCard';
import QtyStepper from '@/components/QtyStepper';
import Rating from '@/components/Rating';
import ReviewCard from '@/components/ReviewCard';
import { Button, ButtonAnchor, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { farmer, product, products, reviewTags, reviewsForProduct } from '@/data/catalog';
import { markets } from '@/data/home';
import { units, vnd } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const EXTRA_REVIEW = {
  author: 'Bích Ngọc',
  date: '19/09/2026',
  rating: 5,
  text: 'Bought 3 bunches for a family lunch. Nothing wilted and the stems snapped clean.',
};

/** FR-022 — one product: price, stock, the seller, pickup, reviews, and what else is nearby. */
const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const p = product(Number(id));
  const [qty, setQty] = useState(Math.min(2, p?.stock ?? 1));

  if (!p) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">That product is not on sale any more</h1>
        <p className="text-ink-muted">The stall may have taken it down. Look at what else they have this week.</p>
        <ButtonLink to="/products">Browse products</ButtonLink>
      </div>
    );
  }

  const f = p.farmerId != null ? farmer(p.farmerId) : undefined;
  const soldOut = p.status !== 'available' || p.stock === 0;

  const genericName = p.name.split(' ').slice(-2).join(' ').toLowerCase();
  const similar = products.filter(
    (o) => o.id !== p.id && o.category === p.category && o.name.toLowerCase().includes(genericName),
  );
  const alsoFromStall =
    p.farmerId != null ? products.filter((o) => o.farmerId === p.farmerId && o.id !== p.id).slice(0, 3) : [];

  const productReviews = reviewsForProduct(p.id);
  const allReviews = [...productReviews, EXTRA_REVIEW];
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  return (
    <div className="flex flex-col gap-8">
      <p className="text-small text-ink-muted">
        <Link to="/products" className="text-brand underline">
          Products
        </Link>{' '}
        ·{' '}
        <Link to="/products" className="text-brand underline">
          {p.category}
        </Link>{' '}
        ·{' '}
        <Link to={`/stalls/${p.farmerId}`} className="text-brand underline">
          {p.stall}
        </Link>
      </p>

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <MapPlaceholder label={`Photo of ${p.name}`} className="min-h-60" />

        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-hand text-h1">{p.name}</h1>
            <FavoriteButton
              initial={p.favorite}
              labelOff={`Add to favorites: ${p.name}`}
              labelOn={`Remove from favorites: ${p.name}`}
            />
          </div>
          <p className="text-body">
            {p.category} · sold per {p.unit} ·{' '}
            <Link to={`/stalls/${p.farmerId}`} className="text-brand underline">
              {p.stall}
            </Link>{' '}
            {f?.rating != null && <Rating value={f.rating} count={f.reviews} />}
          </p>

          <Card className="flex flex-col gap-3 p-6">
            <div className="flex flex-wrap items-center gap-6">
              <span className="font-hand text-price text-[36px] tabular-nums">{vnd(p.price)}</span>
              {!soldOut && (
                <span className="text-body">
                  <b>{units(p.stock, p.unit, p.plural)}</b> left this week
                </span>
              )}
            </div>
            <p className="text-small text-ink-muted">Stock updated today, before this weekend&apos;s orders.</p>
            {soldOut ? (
              <Button variant="secondary" className="w-fit">
                Notify me when back
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-6">
                <QtyStepper value={qty} max={p.stock} unit={p.unit} plural={p.plural} onChange={setQty} />
                <Button
                  onClick={() =>
                    Notification.success({
                      title: 'Added to cart',
                      text: `Added ${units(qty, p.unit, p.plural)} of ${p.name.toLowerCase()} to your cart.`,
                    })
                  }
                >
                  Add to cart
                </Button>
              </div>
            )}
            <p className="text-small text-ink-muted">
              Stock is held for you when you place the order. You pay {vnd(p.price)} a {p.unit} at the stall on pickup.
            </p>
          </Card>
        </div>
      </div>

      {p.desc && (
        <section className="flex flex-col gap-4">
          <h2 className="text-h2">From the stall</h2>
          <p className="text-body max-w-155">{p.desc}</p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {f && (
              <Card className="grid grid-cols-[52px_1fr] items-center gap-x-3 gap-y-2 p-4">
                <span className="bg-brand text-on-brand font-hand row-span-2 grid size-13 place-items-center rounded-full text-[26px] uppercase">
                  {f.stall.charAt(0)}
                </span>
                <div>
                  <b className="text-h3">
                    <Link to={`/stalls/${f.id}`} className="text-inherit underline">
                      {f.stall}
                    </Link>
                  </b>
                  <p className="text-small text-ink-muted">
                    {f.person} · selling here since {f.registered}
                  </p>
                </div>
                <div className="col-span-full mt-1 grid grid-cols-3 gap-2">
                  <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
                    <b className="block text-[17px] tabular-nums">{f.rating ?? '—'}</b>
                    <span className="text-ink-muted text-[12px]">{f.reviews} reviews</span>
                  </div>
                  <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
                    <b className="block text-[17px] tabular-nums">{f.markets.length}</b>
                    <span className="text-ink-muted text-[12px]">markets</span>
                  </div>
                  <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
                    <b className="block text-[17px] tabular-nums">{f.cutoffHours}h</b>
                    <span className="text-ink-muted text-[12px]">order cutoff</span>
                  </div>
                </div>
                <div className="col-span-full flex flex-wrap gap-2">
                  <ButtonLink to={`/stalls/${f.id}`} variant="secondary" size="sm">
                    See the stall
                  </ButtonLink>
                  <ButtonLink to="/messages" variant="secondary" size="sm">
                    Message the stall
                  </ButtonLink>
                </div>
              </Card>
            )}

            <Card className="flex flex-col gap-3 p-6">
              <h3 className="text-h3">Product details</h3>
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                <dt className="text-ink-muted">Sold per</dt>
                <dd className="m-0">1 {p.unit}</dd>
                <dt className="text-ink-muted">Category</dt>
                <dd className="m-0">{p.category}</dd>
                <dt className="text-ink-muted">Stall</dt>
                <dd className="m-0">{p.stall}</dd>
                <dt className="text-ink-muted">Market</dt>
                <dd className="m-0">{p.marketName}</dd>
              </dl>
            </Card>
          </div>
        </section>
      )}

      {f && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2">Where and when you collect</h2>
            <Link to="/map" className="text-brand underline">
              See on the map
            </Link>
          </div>
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
                      <span className="text-ink-muted mt-0.5 block text-[12px]">
                        Stall {f.stallCode} · {m.address}
                      </span>
                    </>
                  );
                },
              },
              { key: 'days', label: 'Days', render: () => f.days },
              { key: 'window', label: 'Pickup window', render: () => f.pickup },
              { key: 'cutoff', label: 'Orders close', render: () => `${f.cutoffHours} hours before your slot` },
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
            Slots hold 5 orders each. A full slot is locked, and the stall stops changes before the cutoff above.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-h2">Reviews of this product</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" disabled>
              Write a review
            </Button>
            <span className="text-small text-ink-muted">Available once an order with this product is completed.</span>
          </div>
        </div>
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-baseline gap-3">
            <b className="font-hand text-[48px] leading-none tabular-nums">{avgRating.toFixed(1)}</b>
            <Rating value={avgRating} />
            <span className="text-small text-ink-muted">{allReviews.length} reviews, all from completed orders</span>
          </div>
          {f && reviewTags[f.id] && (
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {allReviews.map((r, i) => (
            <ReviewCard key={i} author={r.author} date={r.date} rating={r.rating} text={r.text} fluid />
          ))}
        </div>
      </section>

      {similar.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2">{p.name} at other stalls this weekend</h2>
            <span className="text-small text-ink-muted">Same vegetable, different plot and price</span>
          </div>
          <Table
            columns={[
              {
                key: 'product',
                label: 'Product',
                render: (row: typeof p) => (
                  <>
                    <b>{row.name}</b>
                    <span className="text-ink-muted mt-0.5 block text-[12px]">{row.stall}</span>
                  </>
                ),
              },
              { key: 'market', label: 'Market', render: (row: typeof p) => row.marketName },
              {
                key: 'days',
                label: 'Days',
                render: (row: typeof p) => (row.farmerId != null ? (farmer(row.farmerId)?.days ?? '') : ''),
              },
              {
                key: 'price',
                label: 'Price',
                align: 'num',
                render: (row: typeof p) => (
                  <>
                    {vnd(row.price)}{' '}
                    <span className="text-ink-muted block text-[12px] font-normal">per {row.unit}</span>
                  </>
                ),
              },
              {
                key: 'left',
                label: 'Left',
                align: 'num',
                render: (row: typeof p) => units(row.stock, row.unit, row.plural),
              },
              {
                key: 'action',
                label: '',
                align: 'actions',
                render: (row: typeof p) =>
                  row.id === p.id ? (
                    <span className="text-small text-ink-muted">You are here</span>
                  ) : (
                    <ButtonLink to={`/products/${row.id}`} variant="secondary" size="sm">
                      View
                    </ButtonLink>
                  ),
              },
            ]}
            rows={[p, ...similar]}
          />
        </section>
      )}

      {alsoFromStall.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2">Also from {p.stall} this week</h2>
            <Link to={`/stalls/${p.farmerId}`} className="text-brand underline">
              See the stall
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {alsoFromStall.map((o) => (
              <ProductCard key={o.id} product={o} showMarket={false} />
            ))}
          </div>
        </section>
      )}

      <p className="text-small">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => Notification.success({ title: 'Report sent', text: 'An admin will look at this listing.' })}
        >
          Report this listing
        </Button>{' '}
        <span className="text-ink-muted">
          Wrong price, wrong photo or something that does not belong at a farmers market.
        </span>
      </p>
    </div>
  );
};

export default ProductDetailPage;
