import { useTranslation } from 'react-i18next';
import NotificationList from '@/components/notifications/NotificationList';

const FarmerNotificationsPage = () => {
  const { t } = useTranslation('FarmerNotifications');
  return <NotificationList title={t('title')} intro={t('intro')} />;
};

export default FarmerNotificationsPage;
