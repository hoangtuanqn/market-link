import { useTranslation } from 'react-i18next';

const OrderDetailSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex animate-pulse flex-col gap-6">
      <span className="sr-only">{t('notify.list.loading')}</span>

      <div className="flex items-center gap-2">
        <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
        <span className="text-ink-muted text-xs">·</span>
        <div className="bg-surface-sunken h-3.5 w-24 rounded-sm" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="bg-surface-sunken h-3.5 w-48 rounded-sm" />
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-surface-sunken h-7 w-72 max-w-full rounded-sm" />
          <div className="bg-surface-sunken h-6 w-20 rounded-full" />
        </div>
      </div>

      <div className="border-line-strong bg-surface-raised flex h-14 w-full items-center rounded-md border-[1.5px] px-4">
        <div className="bg-surface-sunken h-4 w-96 max-w-full rounded-sm" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <div className="bg-surface-sunken h-6 w-32 rounded-sm" />
            <div className="border-line-strong bg-surface-raised flex w-full flex-col overflow-hidden rounded-md border-[1.5px]">
              <div className="bg-surface-sunken/60 border-line-strong grid grid-cols-[1fr_100px_130px_120px] items-center gap-4 border-b-[1.5px] px-4 py-2.5">
                <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
                <div className="bg-surface-sunken h-3.5 w-16 justify-self-end rounded-sm" />
                <div className="bg-surface-sunken h-3.5 w-16 justify-self-end rounded-sm" />
                <div className="bg-surface-sunken h-3.5 w-16 justify-self-end rounded-sm" />
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="border-line grid grid-cols-[1fr_100px_130px_120px] items-center gap-4 border-b px-4 py-3 last:border-b-0"
                >
                  <div className="bg-surface-sunken h-4 w-36 rounded-sm" />
                  <div className="bg-surface-sunken h-4 w-12 justify-self-end rounded-sm" />
                  <div className="bg-surface-sunken h-4 w-16 justify-self-end rounded-sm" />
                  <div className="bg-surface-sunken h-4 w-18 justify-self-end rounded-sm" />
                </div>
              ))}
            </div>
            <div className="bg-surface-sunken h-3.5 w-48 rounded-sm" />
          </section>

          <section className="flex flex-col gap-3">
            <div className="bg-surface-sunken h-6 w-32 rounded-sm" />
            <div className="flex flex-col gap-4 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="bg-surface-sunken size-7 shrink-0 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="bg-surface-sunken h-5 w-20 rounded-full" />
                    <div className="bg-surface-sunken h-3.5 w-40 rounded-sm" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="sticky top-20 flex flex-col gap-4">
          <div className="border-line-strong bg-surface-raised flex flex-col gap-4 rounded-md border-[1.5px] p-6">
            <div className="bg-surface-sunken h-5 w-24 rounded-sm" />
            <div className="flex items-center justify-between">
              <div className="bg-surface-sunken/70 h-3.5 w-12 rounded-sm" />
              <div className="bg-surface-sunken h-3.5 w-32 rounded-sm" />
            </div>
            <div className="bg-surface-sunken h-8 w-28 rounded-sm" />
          </div>

          <div className="border-line-strong bg-surface-raised flex flex-col gap-4 rounded-md border-[1.5px] p-6">
            <div className="bg-surface-sunken h-5 w-24 rounded-sm" />
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="bg-surface-sunken/70 h-3.5 w-14 rounded-sm" />
                <div className="bg-surface-sunken h-3.5 w-36 rounded-sm" />
              </div>
              <div className="flex items-center justify-between">
                <div className="bg-surface-sunken/70 h-3.5 w-14 rounded-sm" />
                <div className="bg-surface-sunken h-3.5 w-28 rounded-sm" />
              </div>
            </div>
            <div className="bg-surface-sunken h-8 w-28 rounded-sm" />
          </div>

          <div className="border-line-strong bg-surface-raised flex flex-col gap-3 rounded-md border-[1.5px] p-6">
            <div className="bg-surface-sunken h-5 w-24 rounded-sm" />
            <div className="flex flex-col gap-2">
              {['w-16', 'w-14', 'w-14', 'w-12'].map((w, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className={`bg-surface-sunken/70 h-3.5 ${w} rounded-sm`} />
                  <div className="bg-surface-sunken h-3.5 w-28 rounded-sm" />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default OrderDetailSkeleton;
