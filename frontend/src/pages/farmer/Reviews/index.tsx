import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReviewApi, { toReviewCard, type ReviewDto } from '@/api-requests/review.requests';
import StallApi from '@/api-requests/stall.requests';
import Rating from '@/components/Rating';
import AskAssistant from '@/components/assistant/AskAssistant';
import ReviewCard from '@/components/ReviewCard';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import useRequest from '@/hooks/useRequest';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type Filter = 'all' | 'needs' | 'replied' | 'stall' | 'products';

/** Chip labels are `filter.<id>` in FarmerReviews.json. */
const FILTERS: { id: Filter; countable?: boolean }[] = [
  { id: 'all', countable: true },
  { id: 'needs', countable: true },
  { id: 'replied', countable: true },
  { id: 'stall' },
  { id: 'products' },
];

const NO_REVIEWS: ReviewDto[] = [];

/** FR-053 — reviews of the stall and its products, with a reply the customer sees under theirs. */
const FarmerReviewsPage = () => {
  const { t, i18n } = useTranslation('FarmerReviews');
  const { t: tc } = useTranslation();
  const { t: tAssistant } = useTranslation('common');
  const rating = (n: number) =>
    new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

  const { state: profileLoad } = useRequest('farmer-profile', () => StallApi.myProfile());
  const {
    state: reviewsLoad,
    retry: retryReviews,
    mutate,
  } = useRequest('my-reviews', () => ReviewApi.mine({ pageSize: 50 }));

  const [filter, setFilter] = useState<Filter>('all');
  const [openReply, setOpenReply] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [posting, setPosting] = useState<number | null>(null);

  const profile = profileLoad.kind === 'ready' ? profileLoad.data : null;
  const items = reviewsLoad.kind === 'ready' ? reviewsLoad.data.items : NO_REVIEWS;
  const cards = items.map((r) => toReviewCard(r, profile?.stallName ?? ''));

  const matches = (r: (typeof cards)[number], id: Filter) => {
    if (id === 'all') return true;
    if (id === 'needs') return !r.reply;
    if (id === 'replied') return !!r.reply;
    if (id === 'stall') return r.targetType === 'farmer';
    return r.targetType === 'product';
  };
  const counts: Partial<Record<Filter, number>> = {
    all: cards.length,
    needs: cards.filter((r) => matches(r, 'needs')).length,
    replied: cards.filter((r) => matches(r, 'replied')).length,
  };
  const shown = cards.filter((r) => matches(r, filter));

  const postReply = async (reviewId: number, authorName: string) => {
    const text = (drafts[reviewId] ?? '').trim();
    if (!text) return;
    setPosting(reviewId);
    try {
      const res = await ReviewApi.respond(reviewId, text);
      mutate((page) => ({
        ...page,
        items: page.items.map((x) => (x.id === reviewId ? { ...x, response: res } : x)),
      }));
      setOpenReply(null);
      Notification.success({ title: t('toast.postedTitle'), text: t('toast.postedText', { name: authorName }) });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        Notification.info({ text: t('toast.alreadyReplied') });
        retryReviews();
      } else {
        Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
      }
    } finally {
      setPosting(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        {profile && (
          <div className="flex flex-col items-end gap-1">
            <Rating value={profile.ratingAvg} count={profile.ratingCount} />
            <span className="text-small text-ink-muted">
              {t('summary', {
                stall: rating(profile.ratingAvg),
                reviews: t('reviewCount', { count: profile.ratingCount }),
              })}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((it) => (
          <Chip key={it.id} pressed={filter === it.id} onClick={() => setFilter(it.id)}>
            {t(`filter.${it.id}`)}{' '}
            {it.countable && <span className="text-[12px] tabular-nums opacity-80">{counts[it.id]}</span>}
          </Chip>
        ))}
      </div>

      {reviewsLoad.kind === 'loading' || profileLoad.kind === 'loading' ? (
        <MarketCardSkeleton count={2} />
      ) : reviewsLoad.kind === 'error' ? (
        <LoadError noun={t('noun')} onRetry={retryReviews} />
      ) : shown.length ? (
        <div className="flex flex-col gap-4">
          {shown.map((r) => (
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
                r.reply || openReply === r.id ? undefined : (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setOpenReply(r.id)}>
                      {t('action.reply')}
                    </Button>
                    {/* FR-093: the assistant drafts the reply; the Farmer still types it into the box and posts it. */}
                    <AskAssistant question={tAssistant('assistant.ask.review', { rating: r.rating })} />
                  </>
                )
              }
            >
              {!r.reply && openReply === r.id && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void postReply(r.id, r.author);
                  }}
                  className="mt-2 flex flex-col gap-2"
                >
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`reply${r.id}`} className="text-small font-bold">
                      {t('form.label')}
                    </label>
                    <textarea
                      id={`reply${r.id}`}
                      value={drafts[r.id] ?? ''}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder={t('form.placeholder', { name: r.author })}
                      className="border-line-strong bg-surface-raised text-body min-h-18 rounded-sm border-[1.5px] p-3"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm" disabled={posting === r.id}>
                      {t('action.post')}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setOpenReply(null)}>
                      {tc('actions.cancel')}
                    </Button>
                  </div>
                </form>
              )}
            </ReviewCard>
          ))}
        </div>
      ) : (
        <DataState title={t('empty.title')} text={t('empty.text')} />
      )}

      <p className="text-caption text-ink-muted">{t('note')}</p>
    </div>
  );
};

export default FarmerReviewsPage;
