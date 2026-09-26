import { useSyncExternalStore } from 'react';
import { NotificationStore } from '@/lib/notifications/store';

/** Số thông báo chưa đọc, cập nhật theo khung STOMP và các thao tác đánh dấu đã đọc. */
const useUnreadNotifications = () =>
  useSyncExternalStore(NotificationStore.subscribe, NotificationStore.getUnread, () => 0);

export default useUnreadNotifications;
