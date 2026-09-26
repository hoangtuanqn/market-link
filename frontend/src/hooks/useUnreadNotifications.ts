import { useSyncExternalStore } from 'react';
import { NotificationStore } from '@/lib/notifications/store';

/** The unread notification count, updated by STOMP frames and mark-as-read actions. */
const useUnreadNotifications = () =>
  useSyncExternalStore(NotificationStore.subscribe, NotificationStore.getUnread, () => 0);

export default useUnreadNotifications;
