import { useTranslation } from 'react-i18next';
import NotificationList from '@/components/notifications/NotificationList';

/** FR-042 — thông báo của Customer (D-11: in-app; trình duyệt và Web Push theo Settings → Thông báo). */
const CustomerNotificationsPage = () => {
  const { t } = useTranslation('CustomerNotifications');
  return <NotificationList title={t('title')} intro={t('intro')} />;
};

export default CustomerNotificationsPage;
