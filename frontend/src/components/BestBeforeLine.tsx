import { useTranslation } from 'react-i18next';
import type { StorageMode } from '@/api-requests/shelf-life.requests';
import { stockDay } from '@/components/stockDay';

type BestBeforeLineProps = { bestBefore?: string | null; storageMode?: StorageMode | null };

const BestBeforeLine = ({ bestBefore, storageMode }: BestBeforeLineProps) => {
  const { t } = useTranslation();
  const day = stockDay(bestBefore);
  if (!day) return null;
  return (
    <span className="text-ink-muted block text-[13px]">
      {t('bestBefore.line', { day, storage: t(`storageMode.${storageMode ?? 'room'}`) })}
    </span>
  );
};

export default BestBeforeLine;
