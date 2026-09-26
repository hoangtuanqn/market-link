import { useTranslation } from 'react-i18next';
import NotificationList from '@/components/notifications/NotificationList';

/**
 * FR-042 — Farmer notifications: decisions about the stall, MarketLink announcements (orders once the orders module
 * exists).
 */
const FarmerNotificationsPage = () => {
  const { t } = useTranslation('FarmerNotifications');
  return <NotificationList title={t('title')} intro={t('intro')} />;
};

export default FarmerNotificationsPage;
