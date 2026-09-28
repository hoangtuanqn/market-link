import { useTranslation } from 'react-i18next';

/**
 * MarketFormSkeleton mirrors the Market Form (create/edit) layout:
 *
 * - Breadcrumbs & header
 * - Two-column form layout:
 *
 *   - Left: Name, Address fields, Operating days & hours, notes, image uploaders
 *   - Right: Location coordinates/map preview, closures card, action buttons
 */
const MarketFormSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex animate-pulse flex-col gap-6">
      <span className="sr-only">{t('notify.list.loading')}</span>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="bg-surface-sunken h-3.5 w-18 rounded-sm" />
        <span className="text-ink-muted text-xs">·</span>
        <div className="bg-surface-sunken h-3.5 w-24 rounded-sm" />
      </div>

      {/* Title */}
      <div className="flex flex-col gap-2">
        <div className="bg-surface-sunken h-8 w-48 rounded-sm" />
        <div className="bg-surface-sunken h-4 w-96 max-w-full rounded-sm" />
      </div>

      {/* Two columns layout */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left Column */}
        <div className="border-line-strong bg-surface-raised flex flex-col gap-6 rounded-md border-[1.5px] p-6">
          {/* Market Name Field */}
          <div className="flex flex-col gap-2">
            <div className="bg-surface-sunken h-3.5 w-24 rounded-sm" />
            <div className="border-line-strong bg-surface-sunken/40 h-11 w-full rounded-sm border-[1.5px]" />
          </div>

          {/* Address Fields */}
          <div className="flex flex-col gap-3">
            <div className="bg-surface-sunken h-4 w-32 rounded-sm" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="border-line-strong bg-surface-sunken/40 h-11 rounded-sm border-[1.5px]" />
              <div className="border-line-strong bg-surface-sunken/40 h-11 rounded-sm border-[1.5px]" />
              <div className="border-line-strong bg-surface-sunken/40 h-11 rounded-sm border-[1.5px]" />
            </div>
            <div className="border-line-strong bg-surface-sunken/40 h-11 w-full rounded-sm border-[1.5px]" />
          </div>

          {/* Operating Days */}
          <div className="flex flex-col gap-2">
            <div className="bg-surface-sunken h-3.5 w-28 rounded-sm" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="bg-surface-sunken h-9 w-14 rounded-full" />
              ))}
            </div>
          </div>

          {/* Operating Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
              <div className="border-line-strong bg-surface-sunken/40 h-11 rounded-sm border-[1.5px]" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
              <div className="border-line-strong bg-surface-sunken/40 h-11 rounded-sm border-[1.5px]" />
            </div>
          </div>

          {/* Photos */}
          <div className="flex flex-col gap-2">
            <div className="bg-surface-sunken h-3.5 w-28 rounded-sm" />
            <div className="flex gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border-line-strong bg-surface-sunken/50 size-24 rounded-md border-[1.5px]" />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column / Sidebar */}
        <aside className="sticky top-20 flex flex-col gap-6">
          {/* Coordinates & Map Preview */}
          <div className="border-line-strong bg-surface-raised flex flex-col gap-4 rounded-md border-[1.5px] p-6">
            <div className="bg-surface-sunken h-5 w-28 rounded-sm" />
            <div className="grid grid-cols-2 gap-3">
              <div className="border-line-strong bg-surface-sunken/40 h-11 rounded-sm border-[1.5px]" />
              <div className="border-line-strong bg-surface-sunken/40 h-11 rounded-sm border-[1.5px]" />
            </div>
            <div className="border-line-strong bg-surface-sunken/50 h-44 w-full rounded-md border-[1.5px]" />
          </div>

          {/* Closures Card */}
          <div className="border-line-strong bg-surface-raised flex flex-col gap-3 rounded-md border-[1.5px] p-6">
            <div className="bg-surface-sunken h-5 w-36 rounded-sm" />
            <div className="bg-surface-sunken h-3 w-48 rounded-sm" />
            <div className="bg-surface-sunken h-16 w-full rounded-sm" />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <div className="bg-surface-sunken h-11 w-24 rounded-sm" />
            <div className="bg-surface-sunken h-11 w-28 rounded-sm" />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default MarketFormSkeleton;
