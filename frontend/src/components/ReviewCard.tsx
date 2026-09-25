import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@/components/icons';
import Rating from '@/components/Rating';
import TierBadge from '@/components/TierBadge';
import type { Tier } from '@/types/achievement.types';
import { Card } from '@/components/ui/card';
import Helper from '@/utils/helper';

type ReviewCardProps = {
  author: string;
  /** Hạng thành tích của người viết — chỉ hạng, không có số liệu. */
  authorTier?: Tier;
  date: string;
  target?: string;
  rating: number;
  text: string;
  verified?: boolean;
  reply?: { by: string; date: string; text: string };
  fluid?: boolean;
  /** Reply/Report buttons, shown under the reply (or the review, when there isn't one). */
  actions?: ReactNode;
  /** The stall's own reply-composer form, appended below everything else. */
  children?: ReactNode;
};

/** One rating + comment, optionally with the stall's reply (design system `.ml-review`). */
const ReviewCard = ({
  author,
  authorTier,
  date,
  target,
  rating,
  text,
  verified = true,
  reply,
  fluid,
  actions,
  children,
}: ReviewCardProps) => {
  const { t } = useTranslation();
  return (
    <Card as="article" className={Helper.cn('flex flex-col gap-2 p-4', fluid ? 'w-full' : 'w-140 max-w-full')}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-bold">{author}</span>
          {authorTier && <TierBadge tier={authorTier} />}
          {verified && (
            <span className="bg-status-ready-bg text-status-ready-ink inline-flex items-center gap-1 rounded-full px-2 py-px text-[12px] font-bold">
              <CheckIcon size={12} />
              {t('review.verified')}
            </span>
          )}
        </div>
        <span className="text-ink-muted text-[13px]">
          {date}
          {target && ` · ${target}`}
        </span>
      </div>
      <Rating value={rating} />
      <p className="m-0 text-[15px] leading-[1.55]">{text}</p>
      {reply && (
        <div className="bg-surface-sunken mt-1 rounded-sm p-3">
          <b className="mb-0.5 block">{t('review.replied', { by: reply.by, date: reply.date })}</b>
          {reply.text}
        </div>
      )}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      {children}
    </Card>
  );
};

export default ReviewCard;
