import { useState } from 'react';
import Rating from '@/components/Rating';
import ReviewCard from '@/components/ReviewCard';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import { farmer, reviewsForFarmer, type ReviewType } from '@/data/catalog';
import Notification from '@/utils/notification';

const f = farmer(1)!;

type Filter = 'all' | 'needs' | 'replied' | 'stall' | 'products';

const FILTERS: { id: Filter; label: string; countable?: boolean }[] = [
  { id: 'all', label: 'All', countable: true },
  { id: 'needs', label: 'Needs a reply', countable: true },
  { id: 'replied', label: 'Replied', countable: true },
  { id: 'stall', label: 'About the stall' },
  { id: 'products', label: 'About products' },
];

/** FR-053 — reviews of the stall and its products, with a reply the customer sees under theirs. */
const FarmerReviewsPage = () => {
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
    Notification.success({ title: 'Reply posted', text: `Reply posted under ${r.author}'s review.` });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">Reviews</h1>
          <p className="text-body max-w-160">
            What customers said after collecting their orders. A short reply goes a long way, especially on a low
            rating.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Rating value={f.rating ?? 0} count={f.reviews} />
          <span className="text-small text-ink-muted">
            Stall {f.rating} · products 4.8 · {f.reviews} reviews
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((it) => (
          <Chip key={it.id} pressed={filter === it.id} onClick={() => setFilter(it.id)}>
            {it.label} {it.countable && <span className="text-[12px] tabular-nums opacity-80">{counts[it.id]}</span>}
          </Chip>
        ))}
      </div>

      {shown.length ? (
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
                r.reply ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => Notification.success({ title: 'Reply editing', text: 'Reply editing is open.' })}
                  >
                    Edit reply
                  </Button>
                ) : openReply === r.id ? undefined : (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setOpenReply(r.id)}>
                      Reply
                    </Button>
                    <Button variant="ghost" size="sm">
                      Report review
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
                      Your reply, shown under the review
                    </label>
                    <textarea
                      id={`reply${r.id}`}
                      value={drafts[r.id] ?? ''}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder={`Thank you for coming by, ${r.author}. We will pack the order carefully next time.`}
                      className="border-line-strong bg-surface-raised text-body min-h-18 rounded-sm border-[1.5px] p-3"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm">
                      Post reply
                    </Button>
                    <Button type="button" variant="ghost" size="sm">
                      Report review
                    </Button>
                  </div>
                </form>
              )}
            </ReviewCard>
          ))}
        </div>
      ) : (
        <DataState
          title="No reviews yet"
          text="A customer can review your stall and what they bought once their order is completed (D-10)."
        />
      )}

      <p className="text-caption text-ink-muted">
        Reviews cannot be removed by the stall. If one breaks the guidelines, report it and the admin decides (FR-074).
      </p>
    </div>
  );
};

export default FarmerReviewsPage;
