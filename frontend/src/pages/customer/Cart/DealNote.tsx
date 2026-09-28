import { useTranslation } from 'react-i18next';
import type { PreviewItemDto } from '@/api-requests/order.requests';
import BestBeforeLine from '@/components/BestBeforeLine';
import { stockDay } from '@/components/stockDay';

type DealNoteProps = {
  item: PreviewItemDto;
  /** The day the line was added for from /deals, while some market of the stall still offers it. */
  dealDay?: string;
  /** The day the stall is priced for, the one its day picker shows; null until the stall's slots are in. */
  pricedDay: string | null;
};

/**
 * FR-125 (spec §4.5.5) — under a cart line: the deal and until when that batch stays good, or, when the stall is priced
 * for another day, that the deal belongs to its own day.
 */
const DealNote = ({ item, dealDay, pricedDay }: DealNoteProps) => {
  const { t } = useTranslation('CustomerCart');
  const movedOff = dealDay != null && pricedDay != null && pricedDay !== dealDay;
  if (item.discountPercent == null && !movedOff) return null;

  return (
    <span className="mt-1 flex flex-col gap-1 text-[13px] font-normal">
      {item.discountPercent != null && (
        <>
          <span className="text-danger font-bold">{t('deal.badge', { percent: item.discountPercent })}</span>
          <BestBeforeLine bestBefore={item.bestBefore} storageMode={item.storageMode} />
        </>
      )}
      {movedOff && <span className="text-warning-ink">{t('deal.onlyOn', { day: stockDay(dealDay) ?? dealDay })}</span>}
    </span>
  );
};

export default DealNote;
