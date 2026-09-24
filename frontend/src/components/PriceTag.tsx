import { vnd } from '@/lib/format';

type PriceTagProps = { amount: number; unit?: string; was?: number };

/** Hand-lettered yellow tag, hung at an angle. */
const PriceTag = ({ amount, unit, was }: PriceTagProps) => {
  return (
    <span className="bg-accent text-on-accent inline-flex -rotate-3 items-baseline gap-1 rounded-sm px-3 py-1 whitespace-nowrap tabular-nums">
      <span className="font-hand text-[26px] leading-none">{vnd(amount)}</span>
      {unit && <span className="font-hand text-[17px]">/ {unit}</span>}
      {was != null && (
        <span className="font-hand ml-1 text-[17px] line-through">
          <span className="sr-only">Was </span>
          {vnd(was)}
        </span>
      )}
    </span>
  );
};

export default PriceTag;
