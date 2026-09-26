import { useTranslation } from 'react-i18next';
import { BellIcon } from '@/components/icons';
import useUnreadNotifications from '@/hooks/useUnreadNotifications';
import { Popover } from '@/components/ui/popover';
import NotificationsPreview from '@/components/notifications/NotificationsPreview';

/** The bell in the header of the Farmer and Admin areas (DashboardShell), the real unread count from NotificationStore. */
const NotificationBell = ({ to }: { to: string }) => {
  const { t } = useTranslation('common');
  const unread = useUnreadNotifications();
  return (
    <Popover
      label={unread ? t('header.notificationsUnread', { count: unread }) : t('header.notifications')}
      to={to}
      buttonClassName="border-line-strong bg-surface-raised text-ink relative grid size-10 flex-none place-items-center rounded-sm border-[1.5px] no-underline"
      trigger={
        <>
          <BellIcon />
          {unread > 0 && (
            <span className="bg-danger text-on-danger absolute -top-1.5 -right-1.5 grid min-w-4.5 place-items-center rounded-full px-1 text-[10px] font-bold tabular-nums">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </>
      }
    >
      <NotificationsPreview />
    </Popover>
  );
};

export default NotificationBell;
