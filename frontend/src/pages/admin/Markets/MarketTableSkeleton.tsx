import { useTranslation } from 'react-i18next';

const SKELETON_ROWS = 4;

/**
 * MarketTableSkeleton mirrors the Admin Markets page layout:
 *
 * - Markets table with matching columns (Market, Days/Hours, Coordinates, Stalls, Actions)
 * - Map section placeholder
 */
const MarketTableSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex w-full animate-pulse flex-col gap-6">
      <span className="sr-only">{t('notify.list.loading')}</span>

      {/* Table Container */}
      <div className="border-line-strong bg-surface-raised flex w-full flex-col overflow-hidden rounded-md border-[1.5px]">
        {/* Caption */}
        <div className="border-line-strong border-b-[1.5px] p-3 px-4">
          <div className="bg-surface-sunken h-5 w-32 rounded-sm" />
        </div>

        {/* Table Header */}
        <div className="bg-surface-sunken/60 border-line-strong grid grid-cols-[1.5fr_1.2fr_1fr_80px_160px] items-center gap-4 border-b-[1.5px] px-4 py-2.5">
          <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
          <div className="bg-surface-sunken h-3.5 w-24 rounded-sm" />
          <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
          <div className="bg-surface-sunken h-3.5 w-12 justify-self-end rounded-sm" />
          <div className="bg-surface-sunken h-3.5 w-16 justify-self-end rounded-sm" />
        </div>

        {/* Rows */}
        <div className="flex flex-col">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div
              key={i}
              className="border-line grid grid-cols-[1.5fr_1.2fr_1fr_80px_160px] items-center gap-4 border-b px-4 py-3 last:border-b-0"
            >
              {/* Market Name & Address */}
              <div className="flex flex-col gap-1.5">
                <div className="bg-surface-sunken h-4 w-36 rounded-sm" />
                <div className="bg-surface-sunken h-3 w-48 rounded-sm" />
              </div>

              {/* Operating Days & Hours */}
              <div className="flex flex-col gap-1.5">
                <div className="bg-surface-sunken h-4 w-28 rounded-sm" />
                <div className="bg-surface-sunken h-3 w-20 rounded-sm" />
              </div>

              {/* Coordinates */}
              <div className="bg-surface-sunken h-4 w-28 rounded-sm" />

              {/* Stalls */}
              <div className="bg-surface-sunken h-4 w-6 justify-self-end rounded-sm" />

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <div className="bg-surface-sunken h-8 w-14 rounded-sm" />
                <div className="bg-surface-sunken h-8 w-16 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Section Skeleton */}
      <section className="flex flex-col gap-3">
        <div className="bg-surface-sunken h-6 w-32 rounded-sm" />
        <div className="border-line-strong bg-surface-raised min-h-100 w-full rounded-md border-[1.5px]" />
      </section>
    </div>
  );
};

export default MarketTableSkeleton;
