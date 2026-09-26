import { useTranslation } from 'react-i18next';
import NotificationList from '@/components/notifications/NotificationList';

/** FR-042 — thông báo của Admin: đơn đăng ký Farmer mới (mở từ chuông ở header khu admin). */
const AdminNotificationsPage = () => {
  const { t } = useTranslation();
  return <NotificationList title={t('notify.admin.title')} intro={t('notify.admin.intro')} />;
};

export default AdminNotificationsPage;
