import { StarIcon } from '@/components/icons';

/** Star rating with a numeric readout (design system `.ml-rating`). */
const Rating = ({ value, count }: { value: number; count?: number }) => (
  <span className="text-small inline-flex items-center gap-2">
    <span aria-hidden="true" className="text-brand inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={value >= i - 0.25} />
      ))}
    </span>
    <span className="font-bold tabular-nums">{value.toFixed(1)}</span>
    {count != null && <span className="text-ink-muted">({count} reviews)</span>}
    <span className="sr-only">
      {value} out of 5 stars{count != null ? `, ${count} reviews` : ''}
    </span>
  </span>
);

export default Rating;
