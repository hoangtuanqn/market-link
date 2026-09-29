import { useTranslation } from 'react-i18next';

const LATEST_SKELETON_ROWS = 6;

const HomeSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex w-full animate-pulse flex-col gap-6">
      <span className="sr-only">{t('notify.list.loading')}</span>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-line-strong bg-surface-raised flex flex-col justify-between gap-3 rounded-md border-[1.5px] p-5"
          >
            <div className="bg-surface-sunken h-3.5 w-24 rounded-sm" />
            <div className="bg-surface-sunken h-8 w-20 rounded-sm" />
            <div className="bg-surface-sunken h-3 w-32 rounded-sm" />
          </div>
        ))}
      </div>

      <div className="border-line-strong bg-surface-raised flex flex-col gap-4 rounded-md border-[1.5px] p-6">
        <div className="bg-surface-sunken h-5 w-40 rounded-sm" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <div className="bg-surface-sunken h-6 w-8 rounded-sm" />
              <div className="bg-surface-sunken h-4 w-64 max-w-full rounded-sm" />
            </div>
          ))}
        </div>
      </div>

      <div className="border-line-strong bg-surface-raised flex flex-col gap-4 rounded-md border-[1.5px] p-6">
        <div className="bg-surface-sunken h-5 w-48 rounded-sm" />
        <div className="flex flex-col gap-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="bg-surface-sunken h-4 w-36 rounded-sm" />
              <div className="bg-surface-sunken/60 h-3 flex-1 rounded-sm" />
              <div className="bg-surface-sunken h-4 w-20 rounded-sm" />
            </div>
          ))}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="bg-surface-sunken h-6 w-36 rounded-sm" />
          <div className="bg-surface-sunken h-4 w-24 rounded-sm" />
        </div>
        <div className="border-line-strong bg-surface-raised flex w-full flex-col overflow-hidden rounded-md border-[1.5px]">
          <div className="bg-surface-sunken/60 border-line-strong grid grid-cols-[110px_1fr_1fr_1fr_140px_100px_110px] items-center gap-4 border-b-[1.5px] px-4 py-2.5">
            <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-14 justify-self-end rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
          </div>
          <div className="flex flex-col">
            {Array.from({ length: LATEST_SKELETON_ROWS }).map((_, i) => (
              <div
                key={i}
                className="border-line grid grid-cols-[110px_1fr_1fr_1fr_140px_100px_110px] items-center gap-4 border-b px-4 py-3 last:border-b-0"
              >
                <div className="bg-surface-sunken h-4 w-20 rounded-sm" />
                <div className="bg-surface-sunken h-4 w-28 rounded-sm" />
                <div className="bg-surface-sunken h-4 w-24 rounded-sm" />
                <div className="bg-surface-sunken h-4 w-24 rounded-sm" />
                <div className="bg-surface-sunken h-4 w-28 rounded-sm" />
                <div className="bg-surface-sunken h-4 w-16 justify-self-end rounded-sm" />
                <div className="bg-surface-sunken h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeSkeleton;
