import { useTranslation } from 'react-i18next';

const SKELETON_ROWS = 5;

/**
 * ReportsSkeleton mirrors the Admin Reports layout:
 *
 * - 2 top KPI cards (Orders, Revenue)
 * - By Market table (Market, Orders, Revenue)
 * - Top Farmers table (Rank, Stall, Orders, Revenue, Rating)
 * - Top Products table (Product, Sold per, Price, Sold, Revenue)
 */
const ReportsSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex w-full animate-pulse flex-col gap-8">
      <span className="sr-only">{t('notify.list.loading')}</span>

      {/* Top 2 KPI Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="border-line-strong bg-surface-raised flex flex-col justify-between gap-3 rounded-md border-[1.5px] p-5"
          >
            <div className="bg-surface-sunken h-3.5 w-28 rounded-sm" />
            <div className="bg-surface-sunken h-8 w-24 rounded-sm" />
            <div className="bg-surface-sunken h-3 w-36 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Section 1: By Market Table */}
      <section className="flex flex-col gap-3">
        <div className="bg-surface-sunken h-6 w-44 rounded-sm" />
        <div className="border-line-strong bg-surface-raised flex w-full flex-col overflow-hidden rounded-md border-[1.5px]">
          {/* Header */}
          <div className="bg-surface-sunken/60 border-line-strong grid grid-cols-[1fr_140px_160px] items-center gap-4 border-b-[1.5px] px-4 py-2.5">
            <div className="bg-surface-sunken h-3.5 w-24 rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-20 justify-self-end rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-20 justify-self-end rounded-sm" />
          </div>
          {/* Rows */}
          <div className="flex flex-col">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border-line grid grid-cols-[1fr_140px_160px] items-center gap-4 border-b px-4 py-3 last:border-b-0"
              >
                <div className="bg-surface-sunken h-4 w-40 rounded-sm" />
                <div className="bg-surface-sunken h-4 w-12 justify-self-end rounded-sm" />
                <div className="bg-surface-sunken h-4 w-20 justify-self-end rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Top Farmers Table */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="bg-surface-sunken h-6 w-36 rounded-sm" />
          <div className="bg-surface-sunken h-4 w-44 rounded-sm" />
        </div>
        <div className="border-line-strong bg-surface-raised flex w-full flex-col overflow-hidden rounded-md border-[1.5px]">
          {/* Header */}
          <div className="bg-surface-sunken/60 border-line-strong grid grid-cols-[60px_1fr_140px_160px_100px] items-center gap-4 border-b-[1.5px] px-4 py-2.5">
            <div className="bg-surface-sunken h-3.5 w-6 justify-self-end rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-24 justify-self-end rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-20 justify-self-end rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-14 justify-self-end rounded-sm" />
          </div>
          {/* Rows */}
          <div className="flex flex-col">
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <div
                key={i}
                className="border-line grid grid-cols-[60px_1fr_140px_160px_100px] items-center gap-4 border-b px-4 py-3 last:border-b-0"
              >
                <div className="bg-surface-sunken h-4 w-4 justify-self-end rounded-sm" />
                <div className="bg-surface-sunken h-4 w-36 rounded-sm" />
                <div className="bg-surface-sunken h-4 w-12 justify-self-end rounded-sm" />
                <div className="bg-surface-sunken h-4 w-20 justify-self-end rounded-sm" />
                <div className="bg-surface-sunken h-4 w-8 justify-self-end rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Top Products Table */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="bg-surface-sunken h-6 w-36 rounded-sm" />
          <div className="bg-surface-sunken h-4 w-44 rounded-sm" />
        </div>
        <div className="border-line-strong bg-surface-raised flex w-full flex-col overflow-hidden rounded-md border-[1.5px]">
          {/* Header */}
          <div className="bg-surface-sunken/60 border-line-strong grid grid-cols-[1fr_110px_130px_120px_150px] items-center gap-4 border-b-[1.5px] px-4 py-2.5">
            <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-14 justify-self-end rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-14 justify-self-end rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-16 justify-self-end rounded-sm" />
          </div>
          {/* Rows */}
          <div className="flex flex-col">
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <div
                key={i}
                className="border-line grid grid-cols-[1fr_110px_130px_120px_150px] items-center gap-4 border-b px-4 py-3 last:border-b-0"
              >
                <div className="flex flex-col gap-1">
                  <div className="bg-surface-sunken h-4 w-32 rounded-sm" />
                  <div className="bg-surface-sunken h-3 w-24 rounded-sm" />
                </div>
                <div className="bg-surface-sunken h-4 w-12 rounded-sm" />
                <div className="bg-surface-sunken h-4 w-16 justify-self-end rounded-sm" />
                <div className="bg-surface-sunken h-4 w-14 justify-self-end rounded-sm" />
                <div className="bg-surface-sunken h-4 w-20 justify-self-end rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ReportsSkeleton;
