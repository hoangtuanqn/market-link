import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProductApi from '@/api-requests/product.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import ReviewCard from '@/components/ReviewCard';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import Tabs from '@/components/ui/tabs';
import { SHOW_WIP } from '@/config/wip';
import { ADMIN_CUSTOMERS_PATH } from '@/constants/nav';
import { hiddenItems, reviewReport, type HiddenItemType } from '@/data/admin';
import { reviews } from '@/data/catalog';
import useRequest from '@/hooks/useRequest';
import { vnd } from '@/lib/format';
import type { ProductType } from '@/types/product.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import ReportedMessages from './ReportedMessages';

const REVIEW_FILTERS = ['reported', 'lowRated', 'newest'] as const;

/** Reasons an admin picks when hiding something. Keys resolve under `reason.` in the locale file. */
const REASONS = ['advertising', 'abusive', 'offTopic', 'claim', 'other'] as const;

type HideTarget = { kind: 'review' | 'listing'; name: string; id?: number } | null;
const NO_PRODUCTS: ProductType[] = [];

/**
 * FR-074 — hide product listings or reviews that break the guidelines. Hidden items stay in the database with the
 * reason; the owner is told.
 */
const AdminModerationPage = () => {
  const { t } = useTranslation('AdminModeration');
  const { t: tc } = useTranslation();
  // The reviews and hidden tabs are still sample data (review: C8) → production only has the products tab (config/wip.ts).
  const [tab, setTab] = useState(SHOW_WIP ? 'reviews' : 'products');
  const [hidingBusy, setHidingBusy] = useState(false);
  // What customers currently see (contract §5, newest first); hiding removes a row from this list.
  const {
    state: listedLoad,
    retry: retryListed,
    mutate: mutateListed,
  } = useRequest('moderation-products', () =>
    ProductApi.list({ pageSize: 50, sort: 'newest' }).then((result) => result.items),
  );
  const [reviewFilter, setReviewFilter] = useState<string>('reported');
  const [query, setQuery] = useState('');
  const [hiding, setHiding] = useState<HideTarget>(null);
  const [reason, setReason] = useState('');

  const demoReviews = SHOW_WIP ? reviews : [];
  const flagged = demoReviews.filter((r) => r.flagged);
  const lowRated = demoReviews.filter((r) => r.rating <= 2);
  const shownReviews =
    reviewFilter === 'reported' ? flagged : reviewFilter === 'lowRated' ? lowRated : [...demoReviews].slice(0, 4);

  const needle = query.trim().toLowerCase();
  const listed = (listedLoad.kind === 'ready' ? listedLoad.data : NO_PRODUCTS).filter(
    (p) => !needle || `${p.name} ${p.stall}`.toLowerCase().includes(needle),
  );

  const confirmHide = async () => {
    if (!hiding) return;
    // Reviews are still demo data (C8); only listings go to the server here.
    if (hiding.kind === 'listing' && hiding.id != null) {
      const id = hiding.id;
      setHidingBusy(true);
      try {
        await ProductApi.adminHide(id, reason || t(`reason.${REASONS[0]}`));
        mutateListed((list) => list.filter((p) => p.id !== id));
      } catch (error) {
        Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
        setHidingBusy(false);
        return;
      }
      setHidingBusy(false);
    }
    Notification.success({ text: t('hide.done') });
    setHiding(null);
    setReason('');
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

  const hiddenColumns: TableColumn<HiddenItemType>[] = [
    { key: 'item', label: t('col.item') },
    { key: 'owner', label: t('col.owner') },
    { key: 'reason', label: t('col.reason') },
    { key: 'hiddenOn', label: t('col.hiddenOn') },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: () => (
        <Button variant="secondary" size="sm" onClick={() => Notification.success({ text: t('action.unhidden') })}>
          {t('action.unhide')}
        </Button>
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
        onChange={setTab}
        tabs={
          // Reviews và hidden items còn chạy dữ liệu mẫu (SHOW_WIP); reported messages dùng API thật nên luôn có
          SHOW_WIP
            ? [
                { id: 'reviews', label: t('tab.reviews'), count: flagged.length },
                { id: 'products', label: t('tab.products') },
                { id: 'hidden', label: t('tab.hidden'), count: hiddenItems.length },
                { id: 'messages', label: t('tab.messages') },
              ]
            : [
                { id: 'products', label: t('tab.products') },
                { id: 'messages', label: t('tab.messages') },
              ]
        }
      />

      {SHOW_WIP && tab === 'reviews' && (
        <div className="flex flex-col gap-4">
          <div role="group" aria-label={t('reviewFilterLabel')} className="flex flex-wrap gap-2">
            {REVIEW_FILTERS.map((f) => (
              <Chip key={f} pressed={reviewFilter === f} onClick={() => setReviewFilter(f)}>
                {t(`reviewFilter.${f}`)}
                {f !== 'newest' && (
                  <span className="text-ink-muted ml-1">({f === 'reported' ? flagged.length : lowRated.length})</span>
                )}
              </Chip>
            ))}
          </div>

          {reviewFilter === 'reported' && flagged.length > 0 && (
            <Banner
              variant="warning"
              title={t('report.title', { by: reviewReport.by, date: reviewReport.date, quote: reviewReport.quote })}
            >
              {t('report.text')}
            </Banner>
          )}

          {shownReviews.length ? (
            shownReviews.map((r) => (
              <ReviewCard
                key={r.id}
                author={r.author}
                date={r.date}
                target={r.target}
                rating={r.rating}
                text={r.text}
                reply={r.reply}
                fluid
                actions={
                  <div className="flex flex-wrap gap-2">
                    <Button variant="danger" size="sm" onClick={() => setHiding({ kind: 'review', name: r.target })}>
                      {t('action.hideReview')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => Notification.success({ text: t('action.dismissed') })}
                    >
                      {t('action.keepVisible')}
                    </Button>
                    <ButtonLink to={ADMIN_CUSTOMERS_PATH} variant="ghost" size="sm">
                      {t('action.customerAccount')}
                    </ButtonLink>
                  </div>
                }
              />
            ))
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

      {SHOW_WIP && tab === 'hidden' && <Table caption={t('tab.hidden')} columns={hiddenColumns} rows={hiddenItems} />}

      {tab === 'messages' && <ReportedMessages />}

      <Dialog
        open={hiding !== null}
        tone="danger"
        title={hiding ? t(`hide.title.${hiding.kind}`) : ''}
        onClose={() => setHiding(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setHiding(null)}>
              {t('action.keepVisible')}
            </Button>
            <Button variant="danger" onClick={() => void confirmHide()} disabled={hidingBusy}>
              {hiding ? t(`hide.confirm.${hiding.kind}`) : ''}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{hiding ? t(`hide.text.${hiding.kind}`) : ''}</p>
          <SelectField
            id="hide-reason"
            label={t('hide.reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            options={REASONS.map((key) => t(`reason.${key}`))}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default AdminModerationPage;
