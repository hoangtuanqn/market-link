import { useTranslation } from 'react-i18next';

const FarmerDetailSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex animate-pulse flex-col gap-6">
      <span className="sr-only">{t('notify.list.loading')}</span>

      <div className="flex items-center gap-2">
        <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
        <span className="text-ink-muted text-xs">·</span>
        <div className="bg-surface-sunken h-3.5 w-28 rounded-sm" />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="bg-surface-sunken h-3.5 w-36 rounded-sm" />
          <div className="flex items-center gap-3">
            <div className="bg-surface-sunken h-7 w-48 rounded-sm" />
            <div className="bg-surface-sunken h-6 w-24 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="bg-surface-sunken h-10 w-24 rounded-md" />
          <div className="bg-surface-sunken h-10 w-24 rounded-md" />
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-8">
          <div className="border-line-strong bg-surface-raised flex flex-col gap-3 rounded-md border-[1.5px] p-6">
            <div className="bg-surface-sunken h-6 w-36 rounded-sm" />
            <div className="bg-surface-sunken h-4 w-full rounded-sm" />
            <div className="bg-surface-sunken h-4 w-4/5 rounded-sm" />
            <div className="bg-surface-sunken h-4 w-2/3 rounded-sm" />
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-surface-sunken h-6 w-32 rounded-sm" />
            <div className="flex gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-surface-sunken h-24 w-32 rounded-md" />
              ))}
            </div>
          </div>

          <div className="border-line-strong bg-surface-raised flex flex-col gap-4 rounded-md border-[1.5px] p-6">
            <div className="bg-surface-sunken h-6 w-44 rounded-sm" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="border-line flex items-center justify-between border-b pb-3 last:border-b-0">
                  <div className="flex flex-col gap-1.5">
                    <div className="bg-surface-sunken h-4 w-32 rounded-sm" />
                    <div className="bg-surface-sunken h-3 w-48 rounded-sm" />
                  </div>
                  <div className="bg-surface-sunken h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="sticky top-20 flex flex-col gap-4">
          <div className="border-line-strong bg-surface-raised flex flex-col gap-4 rounded-md border-[1.5px] p-6">
            <div className="bg-surface-sunken h-5 w-28 rounded-sm" />
            <div className="flex flex-col gap-3">
              {[
                { label: 'w-14', val: 'w-32' },
                { label: 'w-12', val: 'w-28' },
                { label: 'w-12', val: 'w-40' },
                { label: 'w-20', val: 'w-24' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className={`bg-surface-sunken/70 h-3.5 rounded-sm ${item.label}`} />
                  <div className={`bg-surface-sunken h-3.5 rounded-sm ${item.val}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="border-line-strong bg-surface-raised flex flex-col gap-4 rounded-md border-[1.5px] p-6">
            <div className="bg-surface-sunken h-5 w-24 rounded-sm" />
            <div className="flex items-center justify-between">
              <div className="bg-surface-sunken/70 h-3.5 w-14 rounded-sm" />
              <div className="bg-surface-sunken h-3.5 w-32 rounded-sm" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default FarmerDetailSkeleton;
