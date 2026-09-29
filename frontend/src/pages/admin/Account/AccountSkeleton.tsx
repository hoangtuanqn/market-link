import { useTranslation } from 'react-i18next';

const AccountSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex w-full animate-pulse flex-col gap-6">
      <span className="sr-only">{t('notify.list.loading')}</span>

      <div className="flex items-center gap-4">
        <div className="bg-surface-sunken size-16 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-col gap-2">
          <div className="bg-surface-sunken h-7 w-48 rounded-sm" />
          <div className="bg-surface-sunken h-4 w-36 rounded-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <div className="border-line-strong bg-surface-raised flex h-full flex-col gap-4 rounded-md border-[1.5px] p-6">
          <div className="bg-surface-sunken h-6 w-32 rounded-sm" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
              <div className="border-line-strong bg-surface-sunken/40 h-11 rounded-sm border-[1.5px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
              <div className="border-line-strong bg-surface-sunken/40 h-11 rounded-sm border-[1.5px]" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
              <div className="border-line-strong bg-surface-sunken/40 h-11 rounded-sm border-[1.5px]" />
            </div>
          </div>
          <div className="mt-auto pt-2">
            <div className="bg-surface-sunken h-11 w-28 rounded-sm" />
          </div>
        </div>

        <div className="border-line-strong bg-surface-raised flex h-full flex-col gap-4 rounded-md border-[1.5px] p-6">
          <div className="flex flex-col gap-1">
            <div className="bg-surface-sunken h-6 w-24 rounded-sm" />
            <div className="bg-surface-sunken h-3.5 w-56 rounded-sm" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="bg-surface-sunken h-3.5 w-28 rounded-sm" />
              <div className="border-line-strong bg-surface-sunken/40 h-11 rounded-sm border-[1.5px]" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <div className="bg-surface-sunken h-3.5 w-24 rounded-sm" />
                <div className="border-line-strong bg-surface-sunken/40 h-11 rounded-sm border-[1.5px]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="bg-surface-sunken h-3.5 w-24 rounded-sm" />
                <div className="border-line-strong bg-surface-sunken/40 h-11 rounded-sm border-[1.5px]" />
              </div>
            </div>
          </div>
          <div className="mt-auto pt-2">
            <div className="bg-surface-sunken h-11 w-36 rounded-sm" />
          </div>
        </div>
      </div>

      <div className="border-line-strong bg-surface-raised flex flex-col gap-3 rounded-md border-[1.5px] p-6">
        <div className="flex items-center gap-3">
          <div className="bg-surface-sunken size-6 rounded-full" />
          <div className="bg-surface-sunken h-5 w-48 rounded-sm" />
          <div className="bg-surface-sunken h-6 w-20 rounded-full" />
        </div>
        <div className="bg-surface-sunken h-4 w-96 max-w-full rounded-sm" />
        <div className="pt-1">
          <div className="bg-surface-sunken h-10 w-44 rounded-sm" />
        </div>
      </div>
    </div>
  );
};

export default AccountSkeleton;
