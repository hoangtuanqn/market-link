import { useSyncExternalStore } from 'react';
import { NotificationStore } from '@/lib/notifications/store';

const useUnreadNotifications = () =>
  useSyncExternalStore(NotificationStore.subscribe, NotificationStore.getUnread, () => 0);

export default useUnreadNotifications;
