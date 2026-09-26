import { useTranslation } from 'react-i18next';
import { unitPrice, vnd } from '@/lib/format';

type PriceTagProps = { amount: number; unit?: string; was?: number };

/** Hand-lettered yellow tag, hung at an angle. */
const PriceTag = ({ amount, unit, was }: PriceTagProps) => {
  // Settings → Weights: a price per kg reads per lb in imperial; "was" converts the same way
  const { t } = useTranslation();
  const now = unitPrice(amount, unit);
  const before = was != null ? unitPrice(was, unit).amount : undefined;
  return (
    <span className="bg-accent text-on-accent inline-flex -rotate-3 items-baseline gap-1 rounded-sm px-3 py-1 whitespace-nowrap tabular-nums">
      <span className="font-hand text-[26px] leading-none">{vnd(now.amount)}</span>
      {now.unit && <span className="font-hand text-[17px]">/ {now.unit}</span>}
      {before != null && (
        <span className="font-hand ml-1 text-[17px] line-through">
          <span className="sr-only">{t('price.was')} </span>
          {vnd(before)}
        </span>
      )}
    </span>
  );
};

export default PriceTag;
