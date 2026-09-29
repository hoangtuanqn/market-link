import { useTranslation } from 'react-i18next';

const SKELETON_ROWS = 5;

const AnnouncementTableSkeleton = () => {
  const { t } = useTranslation('AdminAnnouncements');

  return (
    <div
      aria-busy="true"
      className="border-line-strong bg-surface-raised w-full flex-1 animate-pulse overflow-x-auto rounded-md border-[1.5px]"
    >
      <span className="sr-only">{t('list.loading')}</span>
      <table className="w-full border-collapse text-[14px]">
        <thead>
          <tr className="bg-surface-sunken/60 border-line-strong border-b-[1.5px]">
            <th className="px-4 py-2.5 text-left">
              <div className="bg-surface-sunken h-3.5 w-24 rounded-sm" />
            </th>
            <th className="px-4 py-2.5 text-left">
              <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
            </th>
            <th className="px-4 py-2.5 text-left">
              <div className="bg-surface-sunken h-3.5 w-20 rounded-sm" />
            </th>
            <th className="px-4 py-2.5 text-left">
              <div className="bg-surface-sunken h-3.5 w-16 rounded-sm" />
            </th>
            <th className="px-4 py-2.5 text-right">
              <div className="bg-surface-sunken ml-auto h-3.5 w-12 rounded-sm" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <tr key={i} className="hover:bg-surface-quiet">
              <td className="border-line border-t px-4 py-3 align-middle">
                <div className="flex flex-col gap-1.5">
                  <div className="bg-surface-sunken h-4 w-44 max-w-full rounded-sm" />
                  <div className="bg-surface-sunken h-3 w-64 max-w-full rounded-sm" />
                </div>
              </td>
              <td className="border-line border-t px-4 py-3 align-middle">
                <div className="bg-surface-sunken h-5 w-16 rounded-sm" />
              </td>
              <td className="border-line border-t px-4 py-3 align-middle">
                <div className="bg-surface-sunken h-4 w-28 rounded-sm" />
              </td>
              <td className="border-line border-t px-4 py-3 align-middle">
                <div className="bg-surface-sunken h-6 w-20 rounded-full" />
              </td>
              <td className="border-line border-t px-4 py-3 text-right align-middle whitespace-nowrap">
                <div className="bg-surface-sunken ml-auto h-8 w-20 rounded-sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AnnouncementTableSkeleton;
