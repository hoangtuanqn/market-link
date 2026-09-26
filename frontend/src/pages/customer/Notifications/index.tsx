import { useTranslation } from 'react-i18next';
import NotificationList from '@/components/notifications/NotificationList';

/** FR-042 — Customer notifications (D-11: in-app; browser and Web Push follow Settings → Notifications). */
const CustomerNotificationsPage = () => {
  const { t } = useTranslation('CustomerNotifications');
  return <NotificationList title={t('title')} intro={t('intro')} />;
};

export default CustomerNotificationsPage;
