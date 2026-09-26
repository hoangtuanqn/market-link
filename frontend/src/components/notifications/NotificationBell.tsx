import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BellIcon } from '@/components/icons';
import useUnreadNotifications from '@/hooks/useUnreadNotifications';

/** Chuông ở header của khu Farmer và Admin (DashboardShell), số chưa đọc thật từ NotificationStore. */
const NotificationBell = ({ to }: { to: string }) => {
  const { t } = useTranslation();
  const unread = useUnreadNotifications();
  return (
    <Link
      to={to}
      aria-label={unread ? t('header.notificationsUnread', { count: unread }) : t('header.notifications')}
      className="border-line-strong bg-surface-raised text-ink relative grid size-10 flex-none place-items-center rounded-sm border-[1.5px] no-underline"
    >
      <BellIcon />
      {unread > 0 && (
        <span className="bg-danger text-on-danger absolute -top-1.5 -right-1.5 grid min-w-4.5 place-items-center rounded-full px-1 text-[10px] font-bold tabular-nums">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
};

export default NotificationBell;
