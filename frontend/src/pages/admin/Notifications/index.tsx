import { useTranslation } from 'react-i18next';
import NotificationList from '@/components/notifications/NotificationList';

const AdminNotificationsPage = () => {
  const { t } = useTranslation();
  return <NotificationList title={t('notify.admin.title')} intro={t('notify.admin.intro')} />;
};

export default AdminNotificationsPage;
