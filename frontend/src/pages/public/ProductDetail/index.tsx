import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import CatalogApi from '@/api-requests/catalog.requests';
import ProductApi from '@/api-requests/product.requests';
import StallApi, { dayNames, pickupWindow, type StallMarketDto } from '@/api-requests/stall.requests';
import DirectionsButton from '@/components/DirectionsButton';
import FavoriteButton from '@/components/FavoriteButton';
import MapPlaceholder from '@/components/MapPlaceholder';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import ProductCard from '@/components/ProductCard';
import QtyStepper from '@/components/QtyStepper';
import Rating from '@/components/Rating';
import ReviewCard from '@/components/ReviewCard';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import MessageStallButton from '@/components/chat/MessageStallButton';
import { LoadError } from '@/components/ui/data-state';
import { Table } from '@/components/ui/table';
import { reviewTags, reviewsForProduct } from '@/data/catalog';
import { demoTierOf } from '@/data/tiers';
import { SHOW_WIP } from '@/config/wip';
import useRequest from '@/hooks/useRequest';
import { perUnit, unitName, unitPrice, units, vnd } from '@/lib/format';
import type { MarketType } from '@/types/market.types';
import type { ProductType } from '@/types/product.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

/** Still the demo set until reviews arrive with C8. */
const EXTRA_REVIEW = {
  author: 'Bích Ngọc',
  date: '19/09/2026',
  rating: 5,
  text: 'Bought 3 bunches for a family lunch. Nothing wilted and the stems snapped clean.',
};

const NO_MARKETS: MarketType[] = [];
const NO_PRODUCTS: ProductType[] = [];

/** Earliest start to latest end across the days a stall keeps at one market. */
const windowOf = (m: StallMarketDto) => {
  const starts = m.operatingDays.map((d) => d.pickupStartTime).sort();
  const ends = m.operatingDays.map((d) => d.pickupEndTime).sort();
  return pickupWindow(starts[0], ends[ends.length - 1]);
};

/** FR-022 — one product: price, stock, the seller, pickup, reviews, and what else is nearby. */
const ProductDetailPage = () => {
  const { t } = useTranslation('ProductDetail');
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const validId = Number.isInteger(productId) && productId > 0;

  const { state: load, retry } = useRequest(`product:${id}`, () =>
    validId ? ProductApi.get(productId) : Promise.reject(new Error('missing')),
  );
  const missing = load.kind === 'error' && (!validId || Helper.getErrorCode(load.error) === 'PRODUCT_NOT_FOUND');
  const detail = load.kind === 'ready' ? load.data : undefined;
  const farmerId = detail?.product.farmerId;

  // The stall with its markets, days and cutoff — one request keyed by the stall, so it is not repeated per product.
  const { state: stallLoad } = useRequest(`stall:${farmerId ?? 'none'}`, () =>
    farmerId ? StallApi.get(farmerId) : Promise.resolve(null),
  );
  const { state: marketsLoad } = useRequest('markets', () =>
    CatalogApi.listMarkets({ pageSize: 50 }).then((result) => result.items),
  );
  const { state: alsoLoad } = useRequest(`also:${farmerId ?? 'none'}`, () =>
    farmerId ? ProductApi.byFarmer(farmerId) : Promise.resolve(NO_PRODUCTS),
  );
  const categoryId = detail?.product.categoryId;
  const { state: similarLoad } = useRequest(`similar:${categoryId ?? 'none'}`, () =>
    categoryId ? ProductApi.list({ categoryId, pageSize: 8 }).then((r) => r.items) : Promise.resolve(NO_PRODUCTS),
  );

  const [pickedQty, setPickedQty] = useState<number | null>(null);

  if (load.kind === 'loading') {
    return (
      <div className="flex flex-col gap-8">
        <MarketCardSkeleton count={1} />
      </div>
    );
  }

  if (load.kind === 'error' && !missing) {
    return <LoadError noun={t('error.noun')} onRetry={retry} />;
  }

  if (!detail) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('notFound.title')}</h1>
        <p className="text-ink-muted">{t('notFound.text')}</p>
        <ButtonLink to="/products">{t('notFound.browse')}</ButtonLink>
      </div>
    );
  }

  const p = detail.product;
  const desc = detail.description ?? '';
  const stall = stallLoad.kind === 'ready' ? stallLoad.data : null;
  const allMarkets = marketsLoad.kind === 'ready' ? marketsLoad.data : NO_MARKETS;
  const marketById = (marketId: number) => allMarkets.find((m) => m.id === marketId);
  const stallRating = detail.farmer.ratingCount === 0 ? null : Number(detail.farmer.ratingAvg);
  const soldOut = p.status !== 'available' || p.stockQuantity === 0;
  const qty = pickedQty ?? Math.min(2, Math.max(1, p.stockQuantity));
  const stallLink = (
    <Link to={`/stalls/${p.farmerId}`} className="text-brand underline">
      {p.stallName}
    </Link>
  );

  const alsoFromStall = (alsoLoad.kind === 'ready' ? alsoLoad.data : NO_PRODUCTS)
    .filter((o) => o.id !== p.id)
    .slice(0, 3);
  const similar = (similarLoad.kind === 'ready' ? similarLoad.data : NO_PRODUCTS).filter(
    (o) => o.id !== p.id && o.farmerId !== p.farmerId,
  );

  // Reviews stay the demo set until C8; they follow the real product id.
  const allReviews = SHOW_WIP ? [...reviewsForProduct(p.id), EXTRA_REVIEW] : [];
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  return (
    <div className="flex flex-col gap-8">
      <p className="text-small text-ink-muted">
        <Link to="/products" className="text-brand underline">
          {t('breadcrumb')}
        </Link>{' '}
        ·{' '}
        <Link to="/products" className="text-brand underline">
          {p.categoryName}
        </Link>{' '}
        · {stallLink}
      </p>

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <MapPlaceholder label={t('photo', { name: p.name })} className="min-h-60" />

        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-hand text-h1">{p.name}</h1>
            <FavoriteButton
              labelOff={t('favorite.add', { name: p.name })}
              labelOn={t('favorite.remove', { name: p.name })}
            />
          </div>
          <p className="text-body">
            {p.categoryName} · {t('soldPer', { unit: unitName(p.unit) })} · {stallLink}{' '}
            {stallRating != null && <Rating value={stallRating} count={detail.farmer.ratingCount} />}
          </p>

          <Card className="flex flex-col gap-3 p-6">
            <div className="flex flex-wrap items-center gap-6">
              <span className="font-hand text-price text-[36px] tabular-nums">
                {vnd(unitPrice(Number(p.price), p.unit).amount)}
              </span>
              {!soldOut && (
                <span className="text-body">
                  <Trans
                    t={t}
                    i18nKey="left"
                    values={{ qty: units(p.stockQuantity, p.unit) }}
                    components={{ b: <b /> }}
                  />
                </span>
              )}
            </div>
            <p className="text-small text-ink-muted">{t('stockUpdated')}</p>
            {/* The cart and the in-stock notice have no API wired up: the button only shows a toast → dev only (config/wip.ts). */}
            {SHOW_WIP &&
              (soldOut ? (
                <Button variant="secondary" className="w-fit">
                  {t('notifyMe')}
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-6">
                  <QtyStepper value={qty} max={p.stockQuantity} unit={p.unit} onChange={setPickedQty} />
                  <Button
                    onClick={() =>
                      Notification.success({
                        title: t('added.title'),
                        text: t('added.text', { qty: units(qty, p.unit), name: p.name.toLowerCase() }),
                      })
                    }
                  >
                    {t('addToCart')}
                  </Button>
                </div>
              ))}
            <p className="text-small text-ink-muted">{t('payNote', { price: perUnit(Number(p.price), p.unit) })}</p>
          </Card>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">{t('fromStall')}</h2>
        {desc && <p className="text-body max-w-155">{desc}</p>}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="grid grid-cols-[52px_1fr] items-center gap-x-3 gap-y-2 p-4">
            <span className="bg-brand text-on-brand font-hand row-span-2 grid size-13 place-items-center rounded-full text-[26px] uppercase">
              {p.stallName.charAt(0)}
            </span>
            <div>
              <b className="text-h3">
                <Link to={`/stalls/${p.farmerId}`} className="text-inherit underline">
                  {p.stallName}
                </Link>
              </b>
              <p className="text-small text-ink-muted">{detail.farmer.contactPerson}</p>
            </div>
            <div className="col-span-full mt-1 grid grid-cols-3 gap-2">
              <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
                <b className="block text-[17px] tabular-nums">{stallRating ?? '—'}</b>
                <span className="text-ink-muted text-[12px]">
                  {t('stats.reviews', { count: detail.farmer.ratingCount })}
                </span>
              </div>
              <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
                <b className="block text-[17px] tabular-nums">{stall?.markets.length ?? '—'}</b>
                <span className="text-ink-muted text-[12px]">
                  {t('stats.markets', { count: stall?.markets.length ?? 0 })}
                </span>
              </div>
              <div className="bg-surface-sunken rounded-sm px-1 py-2 text-center">
                <b className="block text-[17px] tabular-nums">
                  {stall ? t('stats.hours', { count: stall.orderCutoffHours }) : '—'}
                </b>
                <span className="text-ink-muted text-[12px]">{t('stats.cutoff')}</span>
              </div>
            </div>
            <div className="col-span-full flex flex-wrap gap-2">
              <ButtonLink to={`/stalls/${p.farmerId}`} variant="secondary" size="sm">
                {t('seeStall')}
              </ButtonLink>
              {p.farmerId && <MessageStallButton farmerId={p.farmerId} productId={p.id} />}
            </div>
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <h3 className="text-h3">{t('details.title')}</h3>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('details.soldPer')}</dt>
              <dd className="m-0">{units(1, unitName(p.unit))}</dd>
              <dt className="text-ink-muted">{t('details.shelfLife')}</dt>
              <dd className="m-0">{t('details.shelfLifeValue', { count: p.shelfLifeDays })}</dd>
              <dt className="text-ink-muted">{t('details.category')}</dt>
              <dd className="m-0">{p.categoryName}</dd>
              <dt className="text-ink-muted">{t('details.stall')}</dt>
              <dd className="m-0">{p.stallName}</dd>
              <dt className="text-ink-muted">{t('details.market')}</dt>
              <dd className="m-0">
                {stall ? stall.markets.map((m) => m.marketName).join(', ') : (p.marketName ?? '')}
              </dd>
            </dl>
          </Card>
        </div>
      </section>

      {stall && stall.markets.length > 0 && (
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
                render: (row: StallMarketDto) => (
                  <>
                    <b>{row.marketName}</b>
                    <span className="text-ink-muted mt-0.5 block text-[12px]">
                      {row.stallCode ? `${t('table.stallCode', { code: row.stallCode })} · ` : ''}
                      {marketById(row.marketId)?.address}
                    </span>
                  </>
                ),
              },
              {
                key: 'days',
                label: t('table.days'),
                render: (row: StallMarketDto) => dayNames(row.operatingDays.map((d) => d.dayOfWeek)),
              },
              { key: 'window', label: t('table.window'), render: (row: StallMarketDto) => windowOf(row) },
              {
                key: 'cutoff',
                label: t('table.cutoff'),
                render: () => t('table.cutoffValue', { count: stall.orderCutoffHours }),
              },
              {
                key: 'dir',
                label: '',
                align: 'actions',
                render: (row: StallMarketDto) => {
                  const m = marketById(row.marketId);
                  const lat = row.stallLatitude != null ? Number(row.stallLatitude) : m?.lat;
                  const lng = row.stallLongitude != null ? Number(row.stallLongitude) : m?.lng;
                  return lat != null && lng != null ? <DirectionsButton to={{ lat, lng }} name={p.stallName} /> : null;
                },
              },
            ]}
            rows={stall.markets}
          />
          <p className="text-small text-ink-muted">{t('collect.note')}</p>
        </section>
      )}

      {/* Reviews are still sample data pending C8 → shown in dev only (config/wip.ts). */}
      {SHOW_WIP && (
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
            {reviewTags[p.farmerId] && (
              <div className="flex flex-wrap gap-2">
                {reviewTags[p.farmerId].map(([tag, count]) => (
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
              <ReviewCard
                key={i}
                author={r.author}
                authorTier={demoTierOf(r.author)}
                date={r.date}
                rating={r.rating}
                text={r.text}
                fluid
              />
            ))}
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2">{t('similar.title', { name: p.categoryName })}</h2>
            <span className="text-small text-ink-muted">{t('similar.note')}</span>
          </div>
          <Table
            columns={[
              {
                key: 'product',
                label: t('table.product'),
                render: (row: ProductType) => (
                  <>
                    <b>{row.name}</b>
                    <span className="text-ink-muted mt-0.5 block text-[12px]">{row.stall}</span>
                  </>
                ),
              },
              { key: 'market', label: t('table.market'), render: (row: ProductType) => row.marketName },
              {
                key: 'price',
                label: t('table.price'),
                align: 'num',
                render: (row: ProductType) => (
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
                render: (row: ProductType) => units(row.stock, row.unit, row.plural),
              },
              {
                key: 'action',
                label: '',
                align: 'actions',
                render: (row: ProductType) => (
                  <ButtonLink to={`/products/${row.id}`} variant="secondary" size="sm">
                    {t('similar.view')}
                  </ButtonLink>
                ),
              },
            ]}
            rows={similar}
          />
        </section>
      )}

      {alsoFromStall.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2">{t('also.title', { stall: p.stallName })}</h2>
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

      {/* Reporting a listing has no API yet, the button only shows a toast → dev only (config/wip.ts). */}
      {SHOW_WIP && (
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
      )}
    </div>
  );
};

export default ProductDetailPage;
