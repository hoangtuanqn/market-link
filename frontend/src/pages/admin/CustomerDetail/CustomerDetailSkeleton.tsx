import { useTranslation } from 'react-i18next';

const CustomerDetailSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex flex-1 animate-pulse flex-col gap-6">
      <span className="sr-only">{t('notify.list.loading')}</span>

      <div className="flex items-center gap-2">
        <div className="bg-surface-sunken h-3.5 w-18 rounded-sm" />
        <span className="text-ink-muted text-xs">·</span>
        <div className="bg-surface-sunken h-3.5 w-36 rounded-sm" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-surface-sunken size-16 shrink-0 rounded-full shadow-xs" />
          <div className="flex flex-col gap-2">
            <div className="bg-surface-sunken h-3.5 w-36 rounded-sm" />
            <div className="flex items-center gap-3">
              <div className="bg-surface-sunken h-7 w-48 rounded-sm" />
              <div className="bg-surface-sunken h-6 w-18 rounded-full" />
            </div>
          </div>
        </div>
        <div className="bg-surface-sunken h-10 w-36 rounded-md" />
      </div>

      <div className="grid flex-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="bg-surface-sunken h-5 w-24 rounded-sm" />
              <div className="bg-surface-sunken h-3.5 w-36 rounded-sm" />
            </div>
            <div className="border-line-strong bg-surface-raised overflow-hidden rounded-md border-[1.5px]">
              <div className="bg-surface-sunken/60 border-line-strong flex items-center justify-between border-b-[1.5px] px-4 py-2.5">
                {['w-20', 'w-32', 'w-24', 'w-12', 'w-16', 'w-18'].map((w, idx) => (
                  <div key={idx} className={`bg-surface-sunken h-3.5 rounded-sm ${w}`} />
                ))}
              </div>
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="border-line flex items-center justify-between border-b px-4 py-3 last:border-b-0"
                >
                  <div className="bg-surface-sunken h-4 w-20 rounded-sm" />
                  <div className="flex flex-col gap-1">
                    <div className="bg-surface-sunken h-3.5 w-28 rounded-sm" />
                    <div className="bg-surface-sunken h-3 w-20 rounded-sm" />
                  </div>
                  <div className="bg-surface-sunken h-3.5 w-24 rounded-sm" />
                  <div className="bg-surface-sunken h-3.5 w-8 rounded-sm" />
                  <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
                  <div className="bg-surface-sunken h-6 w-18 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <div className="bg-surface-sunken h-5 w-36 rounded-sm" />
            <div className="border-line-strong bg-surface-raised flex min-h-[160px] flex-1 flex-col gap-3 rounded-md border-[1.5px] p-5">
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
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="border-line-strong bg-surface-raised flex shrink-0 flex-col gap-4 rounded-md border-[1.5px] p-6">
            <div className="bg-surface-sunken h-5 w-20 rounded-sm" />
            <div className="flex flex-col gap-3">
              {[
                { label: 'w-12', val: 'w-44' },
                { label: 'w-14', val: 'w-28' },
                { label: 'w-14', val: 'w-24' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className={`bg-surface-sunken/70 h-3.5 rounded-sm ${item.label}`} />
                  <div className={`bg-surface-sunken h-3.5 rounded-sm ${item.val}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="border-line-strong bg-surface-raised flex shrink-0 flex-col gap-4 rounded-md border-[1.5px] p-6">
            <div className="bg-surface-sunken h-5 w-28 rounded-sm" />
            <div className="flex flex-col gap-3">
              {[
                { label: 'w-24', val: 'w-8' },
                { label: 'w-20', val: 'w-8' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className={`bg-surface-sunken/70 h-3.5 rounded-sm ${item.label}`} />
                  <div className={`bg-surface-sunken h-3.5 rounded-sm ${item.val}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-sunken flex flex-1 flex-col justify-start gap-2.5 rounded-md p-5">
            <div className="bg-surface-sunken-strong/40 h-4 w-36 rounded-sm" />
            <div className="bg-surface-sunken-strong/25 h-3 w-full rounded-sm" />
            <div className="bg-surface-sunken-strong/25 h-3 w-4/5 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailSkeleton;
