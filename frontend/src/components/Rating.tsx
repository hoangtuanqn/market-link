import { useTranslation } from 'react-i18next';
import { StarIcon } from '@/components/icons';

/** Star rating with a numeric readout (design system `.ml-rating`). */
const Rating = ({ value, count }: { value: number; count?: number }) => {
  const { t } = useTranslation();
  const score = value.toFixed(1);
  return (
    <span className="text-small inline-flex items-center gap-2">
      <span aria-hidden="true" className="text-brand inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <StarIcon key={i} filled={value >= i - 0.25} />
        ))}
      </span>
      <span className="font-bold tabular-nums">{score}</span>
      {count != null && <span className="text-ink-muted">{t('rating.count', { count })}</span>}
      <span className="sr-only">
        {count != null ? t('rating.srWithCount', { value, count }) : t('rating.sr', { value })}
      </span>
    </span>
  );
};

export default Rating;
