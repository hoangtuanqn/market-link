import { useTranslation } from 'react-i18next';
import type { ShelfLifeDto } from '@/api-requests/shelf-life.requests';

type ShelfLifeDetailsProps = { shelfLife?: ShelfLifeDto | null; fallbackDays: number };

/**
 * FR-121 — the product page's shelf-life line: how it is kept and for how many days from pickup, plus the stall's own
 * promise when it set a longer time than the suggestion (spec §4.2).
 */
const ShelfLifeDetails = ({ shelfLife, fallbackDays }: ShelfLifeDetailsProps) => {
  const { t } = useTranslation('ProductDetail');
  const { t: tc } = useTranslation();
  const days = shelfLife?.days ?? fallbackDays;
  return (
    <>
      <span className="block">
        {t('details.shelfLifeLine', { count: days, storage: tc(`storageMode.${shelfLife?.storageMode ?? 'room'}`) })}
      </span>
      {shelfLife?.extended && shelfLife.suggestedDays != null && (
        <span className="text-ink-muted block text-[13px]">
          {t('details.shelfLifePromise', { days, suggested: shelfLife.suggestedDays })}
        </span>
      )}
    </>
  );
};

export default ShelfLifeDetails;
