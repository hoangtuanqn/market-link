import { useTranslation } from 'react-i18next';
import NotificationList from '@/components/notifications/NotificationList';

/** FR-042 — thông báo của Farmer: quyết định về sạp, thông báo của MarketLink (đơn hàng khi có module orders). */
const FarmerNotificationsPage = () => {
  const { t } = useTranslation('FarmerNotifications');
  return <NotificationList title={t('title')} intro={t('intro')} />;
};

export default FarmerNotificationsPage;
