import { useTranslation } from 'react-i18next';
import NotificationList from '@/components/notifications/NotificationList';

const CustomerNotificationsPage = () => {
  const { t } = useTranslation('CustomerNotifications');
  return <NotificationList title={t('title')} intro={t('intro')} />;
};

export default CustomerNotificationsPage;
