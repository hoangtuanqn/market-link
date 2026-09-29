import { useTranslation } from 'react-i18next';

export const ReviewCardSkeleton = () => (
  <div className="border-line-strong bg-surface-raised flex flex-col gap-3 rounded-md border-[1.5px] p-5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="bg-surface-sunken size-7 rounded-full" />
        <div className="bg-surface-sunken h-4 w-24 rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
      </div>
      <div className="bg-surface-sunken h-4 w-20 rounded-sm" />
    </div>
    <div className="flex flex-col gap-2 pt-1">
      <div className="bg-surface-sunken h-3.5 w-full rounded-sm" />
      <div className="bg-surface-sunken h-3.5 w-3/4 rounded-sm" />
    </div>
    <div className="flex justify-end gap-2 pt-2">
      <div className="bg-surface-sunken h-8 w-24 rounded-sm" />
      <div className="bg-surface-sunken h-8 w-28 rounded-sm" />
    </div>
  </div>
);

export const ProductModerationTableSkeleton = () => (
  <div className="border-line-strong bg-surface-raised flex w-full flex-col overflow-hidden rounded-md border-[1.5px]">
    <div className="bg-surface-sunken/60 border-line-strong grid grid-cols-[1.5fr_120px_2fr_140px] items-center gap-4 border-b-[1.5px] px-4 py-2.5">
      <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
      <div className="bg-surface-sunken h-3.5 w-14 justify-self-end rounded-sm" />
      <div className="bg-surface-sunken h-3.5 w-24 rounded-sm" />
      <div className="bg-surface-sunken h-3.5 w-16 justify-self-end rounded-sm" />
    </div>
    <div className="flex flex-col">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="border-line grid grid-cols-[1.5fr_120px_2fr_140px] items-center gap-4 border-b px-4 py-3 last:border-b-0"
        >
          <div className="flex flex-col gap-1.5">
            <div className="bg-surface-sunken h-4 w-32 rounded-sm" />
            <div className="bg-surface-sunken h-3 w-40 rounded-sm" />
          </div>
          <div className="bg-surface-sunken h-4 w-16 justify-self-end rounded-sm" />
          <div className="bg-surface-sunken h-3.5 w-48 rounded-sm" />
          <div className="flex justify-end gap-2">
            <div className="bg-surface-sunken h-8 w-14 rounded-sm" />
            <div className="bg-surface-sunken h-8 w-20 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ReportedMessagesSkeleton = () => (
  <div className="flex flex-col gap-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="border-line-strong bg-surface-raised flex flex-col gap-3 rounded-md border-[1.5px] p-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="bg-surface-sunken h-4 w-32 rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-64 rounded-sm" />
          </div>
          <div className="bg-surface-sunken h-8 w-20 rounded-sm" />
        </div>
        <div className="bg-surface-sunken h-12 w-full rounded-sm" />
      </div>
    ))}
  </div>
);

const ModerationSkeleton = ({ tab = 'reviews' }: { tab?: 'reviews' | 'products' | 'hidden' | 'messages' }) => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex w-full animate-pulse flex-col gap-4">
      <span className="sr-only">{t('notify.list.loading')}</span>

      {tab === 'reviews' && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <ReviewCardSkeleton key={i} />
          ))}
        </div>
      )}

      {tab === 'products' && <ProductModerationTableSkeleton />}

      {tab === 'hidden' && (
        <div className="flex flex-col gap-6">
          <div className="bg-surface-sunken h-5 w-40 rounded-sm" />
          <ProductModerationTableSkeleton />
          <div className="bg-surface-sunken h-5 w-40 rounded-sm" />
          <ReviewCardSkeleton />
        </div>
      )}

      {tab === 'messages' && <ReportedMessagesSkeleton />}
    </div>
  );
};

export default ModerationSkeleton;
