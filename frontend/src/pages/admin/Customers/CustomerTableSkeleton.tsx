import { useTranslation } from 'react-i18next';

const SKELETON_ROWS = 5;

const CustomerTableSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div
      aria-busy="true"
      className="border-line-strong bg-surface-raised flex min-h-[380px] w-full flex-1 animate-pulse flex-col overflow-hidden rounded-md border-[1.5px]"
    >
      <span className="sr-only">{t('notify.list.loading')}</span>
      <div className="border-line-strong border-b-[1.5px] p-3 px-4">
        <div className="bg-surface-sunken h-5 w-32 rounded-sm" />
      </div>

      <div className="bg-surface-sunken/60 border-line-strong grid grid-cols-[minmax(220px,2fr)_120px_100px_120px_120px] items-center gap-4 border-b-[1.5px] px-4 py-2.5">
        <div className="bg-surface-sunken h-3.5 w-24 rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-14 justify-self-end rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
        <div className="bg-surface-sunken h-3.5 w-20 justify-self-end rounded-sm" />
      </div>

      <div className="flex flex-1 flex-col">
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <div
            key={i}
            className="border-line grid grid-cols-[minmax(220px,2fr)_120px_100px_120px_120px] items-center gap-4 border-b px-4 py-3 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <div className="bg-surface-sunken size-9 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="bg-surface-sunken h-4 w-32 max-w-full rounded-sm" />
                <div className="bg-surface-sunken h-3 w-48 max-w-full rounded-sm" />
              </div>
            </div>

            <div className="bg-surface-sunken h-4 w-20 rounded-sm" />

            <div className="bg-surface-sunken h-4 w-6 justify-self-end rounded-sm" />

            <div className="bg-surface-sunken h-6 w-20 rounded-full" />

            <div className="bg-surface-sunken h-8.5 w-24 justify-self-end rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerTableSkeleton;
