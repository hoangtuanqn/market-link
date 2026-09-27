import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProductApi from '@/api-requests/product.requests';
import ReviewApi, { toReviewCard } from '@/api-requests/review.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import ReviewCard from '@/components/ReviewCard';
import { Button, ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import Tabs from '@/components/ui/tabs';
import { ADMIN_CUSTOMERS_PATH } from '@/constants/nav';
import useRequest from '@/hooks/useRequest';
import { vnd } from '@/lib/format';
import type { ProductType } from '@/types/product.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import ReportedMessages from './ReportedMessages';

/** Chips filter the visible-reviews queue; the hidden queue is its own tab, always `status: hidden`. */
const REVIEW_FILTERS = ['newest', 'lowRated'] as const;
type ReviewFilter = (typeof REVIEW_FILTERS)[number] | 'hidden';

type Tab = 'reviews' | 'products' | 'hidden' | 'messages';

/** Reasons an admin picks when hiding a listing. Keys resolve under `reason.` in the locale file. */
const REASONS = ['advertising', 'abusive', 'offTopic', 'claim', 'other'] as const;

type HideTarget = { kind: 'review' | 'listing'; name: string; id: number } | null;
const NO_PRODUCTS: ProductType[] = [];

/**
 * FR-074 — hide product listings or reviews that break the guidelines. Hidden items stay in the database; the review
 * hide endpoint carries no reason (unlike listings, which record one for the owner).
 */
const AdminModerationPage = () => {
  const { t } = useTranslation('AdminModeration');
  const { t: tc } = useTranslation();
  const [tab, setTab] = useState<Tab>('reviews');
  const [hidingBusy, setHidingBusy] = useState(false);
  const [unhidingId, setUnhidingId] = useState<number | null>(null);
  // What customers currently see (contract §5, newest first); hiding removes a row from this list.
  const {
    state: listedLoad,
    retry: retryListed,
    mutate: mutateListed,
  } = useRequest('moderation-products', () =>
    ProductApi.list({ pageSize: 50, sort: 'newest' }).then((result) => result.items),
  );
  const [reviewFilter, setReviewFilter] = useState<(typeof REVIEW_FILTERS)[number]>('newest');
  const [query, setQuery] = useState('');
  const [hiding, setHiding] = useState<HideTarget>(null);
  const [reason, setReason] = useState('');

  // The 'hidden' tab is its own filter value, independent of the chips above (FR-074 moderation queue).
  const effectiveFilter: ReviewFilter = tab === 'hidden' ? 'hidden' : reviewFilter;
  const {
    state: reviewsLoad,
    retry: retryReviews,
    mutate: mutateReviews,
  } = useRequest(`admin-reviews:${effectiveFilter}`, () =>
    ReviewApi.adminList(
      effectiveFilter === 'lowRated'
        ? { maxRating: 2, status: 'visible', pageSize: 50 }
        : effectiveFilter === 'hidden'
          ? { status: 'hidden', pageSize: 50 }
          : { status: 'visible', pageSize: 50 },
    ).then((r) => r.items),
  );
  const reviewItems = reviewsLoad.kind === 'ready' ? reviewsLoad.data : [];

  const needle = query.trim().toLowerCase();
  const listed = (listedLoad.kind === 'ready' ? listedLoad.data : NO_PRODUCTS).filter(
    (p) => !needle || `${p.name} ${p.stall}`.toLowerCase().includes(needle),
  );

  const confirmHide = async () => {
    if (!hiding) return;
    setHidingBusy(true);
    try {
      if (hiding.kind === 'listing') {
        await ProductApi.adminHide(hiding.id, reason || t(`reason.${REASONS[0]}`));
        mutateListed((list) => list.filter((p) => p.id !== hiding.id));
      } else {
        await ReviewApi.hide(hiding.id);
        mutateReviews((list) => list.filter((r) => r.id !== hiding.id));
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
      mutateReviews((list) => list.filter((r) => r.id !== id));
      Notification.success({ text: t('action.unhidden') });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setUnhidingId(null);
    }
  };

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
          {vnd(p.price)} <span className="text-ink-muted font-normal">/ {p.unit}</span>
        </>
      ),
    },
    { key: 'desc', label: t('col.description'), render: (p) => <span className="text-small">{p.desc}</span> },
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
        <h1 className="text-h1">{t('title')}</h1>
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
        ]}
      />

      {(tab === 'reviews' || tab === 'hidden') && (
        <div className="flex flex-col gap-4">
          {tab === 'reviews' && (
            <div role="group" aria-label={t('reviewFilterLabel')} className="flex flex-wrap gap-2">
              {REVIEW_FILTERS.map((f) => (
                <Chip key={f} pressed={reviewFilter === f} onClick={() => setReviewFilter(f)}>
                  {t(`reviewFilter.${f}`)}
                </Chip>
              ))}
            </div>
          )}

          {reviewsLoad.kind === 'loading' ? (
            <MarketCardSkeleton count={2} />
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
        </div>
      )}

      {tab === 'products' && (
        <div className="flex flex-col gap-4">
          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className="border-line-strong bg-surface-raised focus-within:outline-focus flex w-full max-w-105 items-stretch overflow-hidden rounded-sm border-[1.5px] focus-within:outline-2 focus-within:outline-offset-1 [&_button]:rounded-none"
          >
            <label htmlFor="moderation-q" className="sr-only">
              {t('search.label')}
            </label>
            <input
              id="moderation-q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="text-body min-w-0 flex-1 bg-transparent px-3 outline-none"
            />
            <Button type="submit">{t('search.submit')}</Button>
          </form>
          {listedLoad.kind === 'loading' ? (
            <MarketCardSkeleton count={3} />
          ) : listedLoad.kind === 'error' ? (
            <LoadError noun={t('error.noun')} onRetry={retryListed} />
          ) : listed.length ? (
            <Table caption={t('recentlyListed')} columns={productColumns} rows={listed} />
          ) : (
            <DataState title={t('empty.title')} text={t('empty.text')} />
          )}
        </div>
      )}

      {tab === 'messages' && <ReportedMessages />}

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
