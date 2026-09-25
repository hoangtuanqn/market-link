import { useTranslation } from 'react-i18next';
import { Card } from './ui/card';

/**
 * Loading state for a list of MarketCards (FR-084). Market cards carry no photo: they are a 1fr/auto grid of name +
 * save, day cells, meta and actions. The skeleton mirrors that grid so the page does not change shape when the data
 * lands.
 */
const MarketCardSkeleton = ({ count = 3 }: { count?: number }) => {
  const { t } = useTranslation();
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Card
          key={i}
          as="article"
          className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 p-4"
          role={i ? undefined : 'status'}
          aria-live={i ? undefined : 'polite'}
          aria-hidden={i ? true : undefined}
        >
          {i === 0 && <span className="sr-only">{t('loading.markets')}</span>}
          <div>
            <span className="ml-skel h-7 w-[62%]" />
            <span className="ml-skel mt-2 h-3.5 w-[88%]" />
          </div>
          <span className="ml-skel size-8 self-start rounded-full" />
          <span className="ml-skel col-span-full h-6.5 w-[266px] max-w-full" />
          <span className="ml-skel col-span-full h-3.5 w-[60%]" />
          <span className="ml-skel col-span-full h-[var(--size-control-sm)] w-[212px] max-w-full" />
        </Card>
      ))}
    </>
  );
};

export default MarketCardSkeleton;
