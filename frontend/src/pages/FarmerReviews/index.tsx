import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Rating from '@/components/Rating';
import ReviewCard from '@/components/ReviewCard';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import { farmer, reviewsForFarmer, type ReviewType } from '@/data/catalog';
import { formatDate } from '@/lib/format';
import Notification from '@/utils/notification';

const f = farmer(1)!;

type Filter = 'all' | 'needs' | 'replied' | 'stall' | 'products';

/** Chip labels are `filter.<id>` in FarmerReviews.json. */
const FILTERS: { id: Filter; countable?: boolean }[] = [
  { id: 'all', countable: true },
  { id: 'needs', countable: true },
  { id: 'replied', countable: true },
  { id: 'stall' },
  { id: 'products' },
];

/** Product rating shown next to the stall's own (not modeled in the demo data). */
const PRODUCTS_RATING = 4.8;

/** "21/09/2026" (how the seeded reviews spell it) → the reader's date format */
const dmy = (s: string) => {
  const [d, m, y] = s.split('/').map(Number);
  return y ? formatDate(new Date(y, m - 1, d)) : s;
};

/** FR-053 — reviews of the stall and its products, with a reply the customer sees under theirs. */
const FarmerReviewsPage = () => {
  const { t, i18n } = useTranslation('FarmerReviews');
  const rating = (n: number) =>
    new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
  const [reviews, setReviews] = useState<ReviewType[]>(reviewsForFarmer(f.id));
  const [filter, setFilter] = useState<Filter>('all');
  const [openReply, setOpenReply] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const matches = (r: ReviewType, id: Filter) => {
    if (id === 'all') return true;
    if (id === 'needs') return !r.reply;
    if (id === 'replied') return !!r.reply;
    if (id === 'stall') return r.targetType === 'farmer';
    return r.targetType === 'product';
  };
  const counts: Partial<Record<Filter, number>> = {
    all: reviews.length,
    needs: reviews.filter((r) => matches(r, 'needs')).length,
    replied: reviews.filter((r) => matches(r, 'replied')).length,
  };
  const shown = reviews.filter((r) => matches(r, filter));

  const postReply = (r: ReviewType) => {
    const text = (drafts[r.id] ?? '').trim();
    if (!text) return;
    setReviews((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, reply: { by: f.stall, date: '24/09/2026', text } } : x)),
    );
    setOpenReply(null);
    Notification.success({ title: t('toast.postedTitle'), text: t('toast.postedText', { name: r.author }) });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Rating value={f.rating ?? 0} count={f.reviews} />
          <span className="text-small text-ink-muted">
            {t('summary', {
              stall: rating(f.rating ?? 0),
              products: rating(PRODUCTS_RATING),
              reviews: t('reviewCount', { count: f.reviews ?? 0 }),
            })}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((it) => (
          <Chip key={it.id} pressed={filter === it.id} onClick={() => setFilter(it.id)}>
            {t(`filter.${it.id}`)}{' '}
            {it.countable && <span className="text-[12px] tabular-nums opacity-80">{counts[it.id]}</span>}
          </Chip>
        ))}
      </div>

      {shown.length ? (
        <div className="flex flex-col gap-4">
          {shown.map((r) => (
            <ReviewCard
              key={r.id}
              author={r.author}
              date={dmy(r.date)}
              target={r.target}
              rating={r.rating}
              text={r.text}
              reply={r.reply && { ...r.reply, date: dmy(r.reply.date) }}
              fluid
              actions={
                r.reply ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => Notification.success({ title: t('toast.editTitle'), text: t('toast.editText') })}
                  >
                    {t('action.editReply')}
                  </Button>
                ) : openReply === r.id ? undefined : (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setOpenReply(r.id)}>
                      {t('action.reply')}
                    </Button>
                    <Button variant="ghost" size="sm">
                      {t('action.report')}
                    </Button>
                  </>
                )
              }
            >
              {!r.reply && openReply === r.id && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    postReply(r);
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
                    <Button type="submit" size="sm">
                      {t('action.post')}
                    </Button>
                    <Button type="button" variant="ghost" size="sm">
                      {t('action.report')}
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
