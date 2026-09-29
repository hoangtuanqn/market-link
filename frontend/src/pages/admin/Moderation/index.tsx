import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import ProductApi from '@/api-requests/product.requests';
import ReviewApi, { toReviewCard } from '@/api-requests/review.requests';
import ReviewCard from '@/components/ReviewCard';
import { Button, ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, type TableColumn } from '@/components/ui/table';
import Tabs from '@/components/ui/tabs';
import { ADMIN_CUSTOMERS_PATH } from '@/constants/nav';
import useRequest from '@/hooks/useRequest';
import { money } from '@/lib/format';
import type { ProductType } from '@/types/product.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import { ReviewCardSkeleton, ProductModerationTableSkeleton } from './ModerationSkeleton';
import QualityReports from './QualityReports';
import ReportedMessages from './ReportedMessages';

const REVIEW_FILTERS = ['newest', 'lowRated'] as const;
type ReviewFilter = (typeof REVIEW_FILTERS)[number] | 'hidden';

type Tab = 'reviews' | 'products' | 'hidden' | 'messages' | 'quality';
const TABS: Tab[] = ['reviews', 'products', 'hidden', 'messages', 'quality'];

const REASONS = ['advertising', 'abusive', 'offTopic', 'claim', 'other'] as const;

type HideTarget = { kind: 'review' | 'listing'; name: string; id: number } | null;
const NO_PRODUCTS: ProductType[] = [];

const PAGE_SIZE = 20;

const AdminModerationPage = () => {
  const { t } = useTranslation('AdminModeration');
  const { t: tc } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = searchParams.get('tab') as Tab | null;
  const tab: Tab = asked && TABS.includes(asked) ? asked : 'reviews';
  const [reviewPage, setReviewPage] = useState(1);
  const setTab = (next: Tab) => {
    setReviewPage(1);
    setSearchParams(next === 'reviews' ? {} : { tab: next }, { replace: true });
  };
  const [hidingBusy, setHidingBusy] = useState(false);
  const [unhidingId, setUnhidingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const { state: listedLoad, retry: retryListed } = useRequest(`moderation-products:${search}:${productPage}`, () =>
    ProductApi.list({ q: search || undefined, sort: 'newest', page: productPage, pageSize: PAGE_SIZE }),
  );
  const {
    state: hiddenListingsLoad,
    retry: retryHiddenListings,
    mutate: mutateHiddenListings,
  } = useRequest('moderation-hidden-products', () => ProductApi.adminHidden());
  const [unhidingListingId, setUnhidingListingId] = useState<number | null>(null);
  const [reviewFilter, setReviewFilter] = useState<(typeof REVIEW_FILTERS)[number]>('newest');
  const [query, setQuery] = useState('');
  const [hiding, setHiding] = useState<HideTarget>(null);
  const [reason, setReason] = useState('');
  const [initialLoading, setInitialLoading] = useState(import.meta.env.MODE !== 'test');

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [tab, reviewFilter]);

  const effectiveFilter: ReviewFilter = tab === 'hidden' ? 'hidden' : reviewFilter;
  const {
    state: reviewsLoad,
    retry: retryReviews,
    mutate: mutateReviews,
  } = useRequest(`admin-reviews:${effectiveFilter}:${reviewPage}`, () =>
    ReviewApi.adminList({
      ...(effectiveFilter === 'lowRated'
        ? { maxRating: 2, status: 'visible' }
        : effectiveFilter === 'hidden'
          ? { status: 'hidden' }
          : { status: 'visible' }),
      page: reviewPage,
      pageSize: PAGE_SIZE,
    }),
  );
  const reviewItems = reviewsLoad.kind === 'ready' ? reviewsLoad.data.items : [];
  const reviewTotal = reviewsLoad.kind === 'ready' ? reviewsLoad.data.total : 0;
  const dropReview = (id: number) => {
    if (reviewItems.length > 1) {
      mutateReviews((current) => ({
        ...current,
        items: current.items.filter((r) => r.id !== id),
        total: current.total - 1,
      }));
    } else if (reviewPage > 1) setReviewPage(reviewPage - 1);
    else retryReviews();
  };

  const listed = listedLoad.kind === 'ready' ? listedLoad.data.items : NO_PRODUCTS;
  const listedTotal = listedLoad.kind === 'ready' ? listedLoad.data.total : 0;

  const confirmHide = async () => {
    if (!hiding) return;
    setHidingBusy(true);
    try {
      if (hiding.kind === 'listing') {
        await ProductApi.adminHide(hiding.id, reason || t(`reason.${REASONS[0]}`));
        if (listed.length === 1 && productPage > 1) setProductPage(productPage - 1);
        else retryListed();
        retryHiddenListings();
      } else {
        await ReviewApi.hide(hiding.id);
        dropReview(hiding.id);
      }
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
      setHidingBusy(false);
      return;
    }
    setHidingBusy(false);
    Notification.success({ text: t('hide.done') });
    setHiding(null);
    setReason('');
  };

  const unhide = async (id: number) => {
    setUnhidingId(id);
    try {
      await ReviewApi.unhide(id);
      dropReview(id);
      Notification.success({ text: t('action.unhidden') });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setUnhidingId(null);
    }
  };

  const unhideListing = async (id: number) => {
    setUnhidingListingId(id);
    try {
      await ProductApi.adminUnhide(id);
      mutateHiddenListings((list) => list.filter((p) => p.id !== id));
      retryListed();
      Notification.success({ text: t('action.unhidden') });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setUnhidingListingId(null);
    }
  };

  const hiddenListingColumns: TableColumn<ProductType>[] = [
    {
      key: 'name',
      label: t('col.product'),
      render: (p) => (
        <>
          <b>{p.name}</b>
          <span className="text-ink-muted block text-[13px]">
            {p.stall} · {p.category}
          </span>
        </>
      ),
    },
    { key: 'reason', label: t('col.reason'), render: (p) => <span className="text-small">{p.hiddenReason}</span> },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (p) => (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            disabled={unhidingListingId === p.id}
            onClick={() => void unhideListing(p.id)}
          >
            {t('action.unhide')}
          </Button>
        </div>
      ),
    },
  ];

  const productColumns: TableColumn<ProductType>[] = [
    {
      key: 'name',
      label: t('col.product'),
      render: (p) => (
        <>
          <b>{p.name}</b>
          <span className="text-ink-muted block text-[13px]">
            {p.stall} · {p.category}
          </span>
        </>
      ),
    },
    {
      key: 'price',
      label: t('col.price'),
      align: 'num',
      render: (p) => (
        <>
          {money(p.price)} <span className="text-ink-muted font-normal">/ {p.unit}</span>
        </>
      ),
    },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (p) => (
        <div className="flex justify-end gap-2">
          <ButtonLink to={`/products/${p.id}`} variant="ghost" size="sm">
            {t('action.view')}
          </ButtonLink>
          <Button variant="danger" size="sm" onClick={() => setHiding({ kind: 'listing', name: p.name, id: p.id })}>
            {t('action.hideListing')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1 text-ink font-bold">{t('title')}</h1>
        <p className="text-body max-w-160">{t('intro')}</p>
      </div>

      <Tabs
        label={t('tabsLabel')}
        value={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={[
          { id: 'reviews', label: t('tab.reviews') },
          { id: 'products', label: t('tab.products') },
          { id: 'hidden', label: t('tab.hidden') },
          { id: 'messages', label: t('tab.messages') },
          { id: 'quality', label: t('tab.quality') },
        ]}
      />

      {tab === 'hidden' && (
        <section aria-labelledby="hidden-listings" className="flex flex-col gap-4">
          <h2 id="hidden-listings" className="text-h3">
            {t('hiddenQueue.listings')}
          </h2>
          {hiddenListingsLoad.kind === 'loading' || initialLoading ? (
            <ProductModerationTableSkeleton />
          ) : hiddenListingsLoad.kind === 'error' ? (
            <LoadError noun={t('error.noun')} onRetry={retryHiddenListings} />
          ) : hiddenListingsLoad.data.length ? (
            <Table columns={hiddenListingColumns} rows={hiddenListingsLoad.data} />
          ) : (
            <DataState title={t('hiddenQueue.noListings')} text={t('hiddenQueue.noListingsText')} />
          )}
          <h2 className="text-h3">{t('hiddenQueue.reviews')}</h2>
        </section>
      )}

      {(tab === 'reviews' || tab === 'hidden') && (
        <div className="flex flex-col gap-4">
          {tab === 'reviews' && (
            <div role="group" aria-label={t('reviewFilterLabel')} className="flex flex-wrap gap-2">
              {REVIEW_FILTERS.map((f) => (
                <Chip
                  key={f}
                  pressed={reviewFilter === f}
                  onClick={() => {
                    setReviewFilter(f);
                    setReviewPage(1);
                  }}
                >
                  {t(`reviewFilter.${f}`)}
                </Chip>
              ))}
            </div>
          )}

          {reviewsLoad.kind === 'loading' || initialLoading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <ReviewCardSkeleton key={i} />
              ))}
            </div>
          ) : reviewsLoad.kind === 'error' ? (
            <LoadError noun={t('error.reviewsNoun')} onRetry={retryReviews} />
          ) : reviewItems.length ? (
            reviewItems.map((r) => {
              const card = toReviewCard(r, r.stallName);
              return (
                <ReviewCard
                  key={r.id}
                  author={card.author}
                  date={card.date}
                  target={card.target}
                  rating={card.rating}
                  text={card.text}
                  reply={card.reply}
                  fluid
                  actions={
                    tab === 'hidden' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={unhidingId === r.id}
                        onClick={() => void unhide(r.id)}
                      >
                        {t('action.unhide')}
                      </Button>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setHiding({ kind: 'review', name: card.target, id: r.id })}
                        >
                          {t('action.hideReview')}
                        </Button>
                        <ButtonLink to={ADMIN_CUSTOMERS_PATH} variant="ghost" size="sm">
                          {t('action.customerAccount')}
                        </ButtonLink>
                      </div>
                    )
                  }
                />
              );
            })
          ) : (
            <DataState title={t('empty.title')} text={t('empty.text')} />
          )}
          {reviewsLoad.kind === 'ready' && reviewTotal > PAGE_SIZE && (
            <Pagination page={reviewPage} pages={Math.ceil(reviewTotal / PAGE_SIZE)} onChange={setReviewPage} />
          )}
        </div>
      )}

      {tab === 'products' && (
        <div className="flex flex-col gap-4">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(query.trim());
              setProductPage(1);
            }}
            className="border-line-strong bg-surface-raised focus-within:outline-focus flex w-full max-w-105 items-stretch overflow-hidden rounded-sm border-[1.5px] focus-within:outline-2 focus-within:outline-offset-1 [&_button]:rounded-none"
          >
            <label htmlFor="moderation-q" className="sr-only">
              {t('search.label')}
            </label>
            <input
              id="moderation-q"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value) {
                  setSearch('');
                  setProductPage(1);
                }
              }}
              placeholder={t('search.placeholder')}
              className="text-body min-w-0 flex-1 bg-transparent px-3 outline-none"
            />
            <Button type="submit">{t('search.submit')}</Button>
          </form>
          {listedLoad.kind === 'loading' || initialLoading ? (
            <ProductModerationTableSkeleton />
          ) : listedLoad.kind === 'error' ? (
            <LoadError noun={t('error.noun')} onRetry={retryListed} />
          ) : listed.length ? (
            <>
              <Table caption={t('recentlyListed')} columns={productColumns} rows={listed} />
              {listedTotal > PAGE_SIZE && (
                <Pagination page={productPage} pages={Math.ceil(listedTotal / PAGE_SIZE)} onChange={setProductPage} />
              )}
            </>
          ) : (
            <DataState title={t('empty.title')} text={t('empty.text')} />
          )}
        </div>
      )}

      {tab === 'messages' && <ReportedMessages />}

      {tab === 'quality' && <QualityReports />}

      <Dialog
        open={hiding !== null}
        tone="danger"
        title={hiding ? t(`hide.title.${hiding.kind}`) : ''}
        onClose={() => setHiding(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setHiding(null)}>
              {tc('actions.cancel')}
            </Button>
            <Button variant="danger" onClick={() => void confirmHide()} disabled={hidingBusy}>
              {hiding ? t(`hide.confirm.${hiding.kind}`) : ''}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{hiding ? t(`hide.text.${hiding.kind}`) : ''}</p>
          {hiding?.kind === 'listing' && (
            <SelectField
              id="hide-reason"
              label={t('hide.reason')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              options={REASONS.map((key) => t(`reason.${key}`))}
            />
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default AdminModerationPage;
