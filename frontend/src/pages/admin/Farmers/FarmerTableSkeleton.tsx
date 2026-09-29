import { useTranslation } from 'react-i18next';
import { SKELETON_ROWS } from './constants';

const FarmerTableSkeleton = () => {
  const { t } = useTranslation('AdminFarmers');
  return (
    <div
      aria-busy="true"
      className="border-line-strong bg-surface-raised animate-pulse overflow-hidden rounded-md border-[1.5px]"
    >
      <span className="sr-only">{t('loading')}</span>
      <div className="border-line-strong border-b-[1.5px] p-3 px-4">
        <div className="bg-surface-sunken h-5 w-28 rounded-sm" />
      </div>
      <div className="bg-surface-sunken/60 border-line-strong flex gap-4 border-b-[1.5px] px-4 py-2.5">
        {['w-24', 'w-20', 'w-24', 'w-16'].map((w, idx) => (
          <div key={`${w}-${idx}`} className={`bg-surface-sunken h-3 rounded-sm ${w}`} />
        ))}
      </div>
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <div key={i} className="border-line flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="bg-surface-sunken h-4 w-40 max-w-full rounded-sm" />
            <div className="bg-surface-sunken h-3 w-52 max-w-full rounded-sm" />
          </div>
          <div className="bg-surface-sunken hidden h-4 w-48 rounded-sm sm:block" />
          <div className="bg-surface-sunken hidden h-4 w-20 rounded-sm md:block" />
          <div className="bg-surface-sunken h-9 w-28 rounded-sm" />
        </div>
      ))}
    </div>
  );
};

export default FarmerTableSkeleton;
