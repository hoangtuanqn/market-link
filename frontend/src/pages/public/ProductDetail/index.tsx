import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import DirectionsButton from '@/components/DirectionsButton';
import FavoriteButton from '@/components/FavoriteButton';
import MapPlaceholder from '@/components/MapPlaceholder';
import ProductCard from '@/components/ProductCard';
import QtyStepper from '@/components/QtyStepper';
import Rating from '@/components/Rating';
import ReviewCard from '@/components/ReviewCard';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { farmer, product, products, reviewTags, reviewsForProduct } from '@/data/catalog';
import { markets } from '@/data/home';
import { dayList, formatClock, formatDate, perUnit, unitName, unitPrice, units, vnd } from '@/lib/format';
import Notification from '@/utils/notification';

const EXTRA_REVIEW = {
  author: 'Bích Ngọc',
  date: '19/09/2026',
  rating: 5,
  text: 'Bought 3 bunches for a family lunch. Nothing wilted and the stems snapped clean.',
};

/**
 * The demo data spells a stall's days "Sat, Sun", its window "06:00 – 10:30" and dates "02/08/2026"; shown through
 * format.ts so they follow the reader's language, clock and date settings.
 */
const DOW_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const stallDays = (days: string) => dayList(days.split(', ').map((d) => DOW_ABBR.indexOf(d)));
const pickupWindow = (pickup: string) =>
  pickup
    .split('–')
    .map((s) => formatClock(s.trim()))
    .join(' – ');
const dmy = (s: string) => {
  const [d, m, y] = s.split('/').map(Number);
  return y ? formatDate(new Date(y, m - 1, d)) : s;
};

/** FR-022 — one product: price, stock, the seller, pickup, reviews, and what else is nearby. */
const ProductDetailPage = () => {
  const { t } = useTranslation('ProductDetail');
  const { id } = useParams<{ id: string }>();
  const p = product(Number(id));
  const [qty, setQty] = useState(Math.min(2, p?.stock ?? 1));

  if (!p) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('notFound.title')}</h1>
        <p className="text-ink-muted">{t('notFound.text')}</p>
        <ButtonLink to="/products">{t('notFound.browse')}</ButtonLink>
      </div>
    );
  }

  const f = p.farmerId != null ? farmer(p.farmerId) : undefined;
  // Chỉ gian hàng đã duyệt mới có trang công khai; thiếu farmerId thì không dựng link /stalls/undefined
  const stallLink =
    f?.approval === 'approved' ? (
      <Link to={`/stalls/${f.id}`} className="text-brand underline">
        {p.stall}
      </Link>
    ) : (
      p.stall
    );
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
          {t('breadcrumb')}
        </Link>{' '}
        ·{' '}
        <Link to="/products" className="text-brand underline">
          {p.category}
        </Link>{' '}
        · {stallLink}
      </p>

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <MapPlaceholder label={t('photo', { name: p.name })} className="min-h-60" />

        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-hand text-h1">{p.name}</h1>
            <FavoriteButton
              initial={p.favorite}
              labelOff={t('favorite.add', { name: p.name })}
              labelOn={t('favorite.remove', { name: p.name })}
            />
          </div>
          <p className="text-body">
            {p.category} · {t('soldPer', { unit: unitName(p.unit) })} · {stallLink}{' '}
            {f?.rating != null && <Rating value={f.rating} count={f.reviews} />}
          </p>

          <Card className="flex flex-col gap-3 p-6">
            <div className="flex flex-wrap items-center gap-6">
              <span className="font-hand text-price text-[36px] tabular-nums">
                {vnd(unitPrice(p.price, p.unit).amount)}
              </span>
              {!soldOut && (
                <span className="text-body">
                  <Trans
                    t={t}
                    i18nKey="left"
                    values={{ qty: units(p.stock, p.unit, p.plural) }}
                    components={{ b: <b /> }}
                  />
                </span>
              )}
            </div>
            <p className="text-small text-ink-muted">{t('stockUpdated')}</p>
            {soldOut ? (
              <Button variant="secondary" className="w-fit">
                {t('notifyMe')}
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-6">
                <QtyStepper value={qty} max={p.stock} unit={p.unit} plural={p.plural} onChange={setQty} />
                <Button
                  onClick={() =>
                    Notification.success({
                      title: t('added.title'),
                      text: t('added.text', { qty: units(qty, p.unit, p.plural), name: p.name.toLowerCase() }),
                    })
                  }
                >
                  {t('addToCart')}
                </Button>
              </div>
            )}
            <p className="text-small text-ink-muted">{t('payNote', { price: perUnit(p.price, p.unit) })}</p>
          </Card>
        </div>
      </div>

      {p.desc && (
        <section className="flex flex-col gap-4">
          <h2 className="text-h2">{t('fromStall')}</h2>
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
                    {f.person} · {t('sellingSince', { date: dmy(f.registered) })}
                  </p>
                </div>
                <div className="col-span-full mt-1 grid grid-cols-3 gap-2">
                  <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
                    <b className="block text-[17px] tabular-nums">{f.rating ?? '—'}</b>
                    <span className="text-ink-muted text-[12px]">{t('stats.reviews', { count: f.reviews })}</span>
                  </div>
                  <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
                    <b className="block text-[17px] tabular-nums">{f.markets.length}</b>
                    <span className="text-ink-muted text-[12px]">
                      {t('stats.markets', { count: f.markets.length })}
                    </span>
                  </div>
                  <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
                    <b className="block text-[17px] tabular-nums">{t('stats.hours', { count: f.cutoffHours })}</b>
                    <span className="text-ink-muted text-[12px]">{t('stats.cutoff')}</span>
                  </div>
                </div>
                <div className="col-span-full flex flex-wrap gap-2">
                  <ButtonLink to={`/stalls/${f.id}`} variant="secondary" size="sm">
                    {t('seeStall')}
                  </ButtonLink>
                  <ButtonLink to="/messages" variant="secondary" size="sm">
                    {t('messageStall')}
                  </ButtonLink>
                </div>
              </Card>
            )}

            <Card className="flex flex-col gap-3 p-6">
              <h3 className="text-h3">{t('details.title')}</h3>
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                <dt className="text-ink-muted">{t('details.soldPer')}</dt>
                <dd className="m-0">{units(1, unitName(p.unit))}</dd>
                <dt className="text-ink-muted">{t('details.category')}</dt>
                <dd className="m-0">{p.category}</dd>
                <dt className="text-ink-muted">{t('details.stall')}</dt>
                <dd className="m-0">{p.stall}</dd>
                <dt className="text-ink-muted">{t('details.market')}</dt>
                <dd className="m-0">{p.marketName}</dd>
              </dl>
            </Card>
          </div>
        </section>
      )}

      {f && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2">{t('collect.title')}</h2>
            <Link to="/map" className="text-brand underline">
              {t('collect.map')}
            </Link>
          </div>
          <Table
            columns={[
              {
                key: 'market',
                label: t('table.market'),
                render: (row: { id: number }) => {
                  const m = markets.find((mm) => mm.id === row.id)!;
                  return (
                    <>
                      <b>{m.name}</b>
                      <span className="text-ink-muted mt-0.5 block text-[12px]">
                        {t('table.stallCode', { code: f.stallCode })} · {m.address}
                      </span>
                    </>
                  );
                },
              },
              { key: 'days', label: t('table.days'), render: () => stallDays(f.days) },
              { key: 'window', label: t('table.window'), render: () => pickupWindow(f.pickup) },
              {
                key: 'cutoff',
                label: t('table.cutoff'),
                render: () => t('table.cutoffValue', { count: f.cutoffHours }),
              },
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
          <p className="text-small text-ink-muted">{t('collect.note')}</p>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-h2">{t('reviews.title')}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" disabled>
              {t('reviews.write')}
            </Button>
            <span className="text-small text-ink-muted">{t('reviews.writeNote')}</span>
          </div>
        </div>
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-baseline gap-3">
            <b className="font-hand text-[48px] leading-none tabular-nums">{avgRating.toFixed(1)}</b>
            <Rating value={avgRating} />
            <span className="text-small text-ink-muted">{t('reviews.summary', { count: allReviews.length })}</span>
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
            <h2 className="text-h2">{t('similar.title', { name: p.name })}</h2>
            <span className="text-small text-ink-muted">{t('similar.note')}</span>
          </div>
          <Table
            columns={[
              {
                key: 'product',
                label: t('table.product'),
                render: (row: typeof p) => (
                  <>
                    <b>{row.name}</b>
                    <span className="text-ink-muted mt-0.5 block text-[12px]">{row.stall}</span>
                  </>
                ),
              },
              { key: 'market', label: t('table.market'), render: (row: typeof p) => row.marketName },
              {
                key: 'days',
                label: t('table.days'),
                render: (row: typeof p) => {
                  const days = row.farmerId != null ? farmer(row.farmerId)?.days : undefined;
                  return days ? stallDays(days) : '';
                },
              },
              {
                key: 'price',
                label: t('table.price'),
                align: 'num',
                render: (row: typeof p) => (
                  <>
                    {vnd(unitPrice(row.price, row.unit).amount)}{' '}
                    <span className="text-ink-muted block text-[12px] font-normal">
                      {t('table.perUnit', { unit: unitName(row.unit) })}
                    </span>
                  </>
                ),
              },
              {
                key: 'left',
                label: t('table.left'),
                align: 'num',
                render: (row: typeof p) => units(row.stock, row.unit, row.plural),
              },
              {
                key: 'action',
                label: '',
                align: 'actions',
                render: (row: typeof p) =>
                  row.id === p.id ? (
                    <span className="text-small text-ink-muted">{t('similar.here')}</span>
                  ) : (
                    <ButtonLink to={`/products/${row.id}`} variant="secondary" size="sm">
                      {t('similar.view')}
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
            <h2 className="text-h2">{t('also.title', { stall: p.stall })}</h2>
            <Link to={`/stalls/${p.farmerId}`} className="text-brand underline">
              {t('seeStall')}
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
          onClick={() => Notification.success({ title: t('report.sentTitle'), text: t('report.sentText') })}
        >
          {t('report.button')}
        </Button>{' '}
        <span className="text-ink-muted">{t('report.note')}</span>
      </p>
    </div>
  );
};

export default ProductDetailPage;
