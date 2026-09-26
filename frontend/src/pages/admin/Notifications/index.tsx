import { useTranslation } from 'react-i18next';
import NotificationList from '@/components/notifications/NotificationList';

/** FR-042 — the Admin's notifications: new Farmer applications (opened from the bell in the admin area's header). */
const AdminNotificationsPage = () => {
  const { t } = useTranslation();
  return <NotificationList title={t('notify.admin.title')} intro={t('notify.admin.intro')} />;
};

export default AdminNotificationsPage;
