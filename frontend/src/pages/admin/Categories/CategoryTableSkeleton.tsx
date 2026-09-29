import { useTranslation } from 'react-i18next';

const SKELETON_ROWS = 6;

const CategoryTableSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div
      aria-busy="true"
      className="border-line-strong bg-surface-raised flex min-h-[440px] w-full flex-1 animate-pulse flex-col overflow-hidden rounded-md border-[1.5px]"
    >
      <span className="sr-only">{t('notify.list.loading')}</span>

      <div className="border-line-strong border-b-[1.5px] p-3 px-4">
        <div className="bg-surface-sunken h-5 w-32 rounded-sm" />
      </div>

      <div className="bg-surface-sunken/60 border-line-strong grid grid-cols-[1.5fr_100px_100px_80px_100px_130px] items-center gap-4 border-b-[1.5px] px-4 py-2.5">
        <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-16 justify-self-end rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-16 justify-self-end rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-14 justify-self-end rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-14 justify-self-end rounded-sm" />
      </div>

      <div className="flex flex-1 flex-col">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <div
            key={i}
            className="border-line grid grid-cols-[1.5fr_100px_100px_80px_100px_130px] items-center gap-4 border-b px-4 py-3 last:border-b-0"
          >
            <div className="border-line-strong bg-surface-sunken/30 h-9 w-40 rounded-sm border" />

            <div className="bg-surface-sunken h-4 w-12 justify-self-end rounded-sm" />

            <div className="bg-surface-sunken h-4 w-12 justify-self-end rounded-sm" />

            <div className="bg-surface-sunken h-4 w-6 justify-self-end rounded-sm" />

            <div className="bg-surface-sunken h-6 w-20 rounded-full" />

            <div className="flex justify-end gap-2">
              <div className="bg-surface-sunken h-8 w-12 rounded-sm" />
              <div className="bg-surface-sunken h-8 w-14 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryTableSkeleton;
