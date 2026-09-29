import { useTranslation } from 'react-i18next';
import type { PreviewItemDto } from '@/api-requests/order.requests';
import BestBeforeLine from '@/components/BestBeforeLine';
import { stockDay } from '@/components/stockDay';

type DealNoteProps = {
  item: PreviewItemDto;
  dealDay?: string;
  pricedDay: string | null;
};

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
