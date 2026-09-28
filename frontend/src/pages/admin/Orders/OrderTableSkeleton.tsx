import { useTranslation } from 'react-i18next';

const SKELETON_ROWS = 6;

/**
 * OrderTableSkeleton mirrors the Admin Orders table structure with matching columns to prevent layout shifts during
 * initial load and filtering.
 */
const OrderTableSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div
      aria-busy="true"
      className="border-line-strong bg-surface-raised flex min-h-[380px] w-full flex-1 animate-pulse flex-col overflow-hidden rounded-md border-[1.5px]"
    >
      <span className="sr-only">{t('notify.list.loading')}</span>

      {/* Caption bar */}
      <div className="border-line-strong border-b-[1.5px] p-3 px-4">
        <div className="bg-surface-sunken h-5 w-36 rounded-sm" />
      </div>

      {/* Table Header */}
      <div className="bg-surface-sunken/60 border-line-strong grid grid-cols-[100px_1fr_1fr_1fr_140px_100px_110px] items-center gap-4 border-b-[1.5px] px-4 py-2.5">
        <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-14 justify-self-end rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
      </div>

      {/* Rows */}
      <div className="flex flex-1 flex-col">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <div
            key={i}
            className="border-line grid grid-cols-[100px_1fr_1fr_1fr_140px_100px_110px] items-center gap-4 border-b px-4 py-3 last:border-b-0"
          >
            {/* Order Code */}
            <div className="bg-surface-sunken h-4 w-16 rounded-sm" />

            {/* Customer */}
            <div className="bg-surface-sunken h-4 w-28 rounded-sm" />

            {/* Stall */}
            <div className="bg-surface-sunken h-4 w-24 rounded-sm" />

            {/* Market */}
            <div className="bg-surface-sunken h-4 w-24 rounded-sm" />

            {/* Pickup */}
            <div className="bg-surface-sunken h-4 w-28 rounded-sm" />

            {/* Total */}
            <div className="bg-surface-sunken h-4 w-16 justify-self-end rounded-sm" />

            {/* Status */}
            <div className="bg-surface-sunken h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderTableSkeleton;
