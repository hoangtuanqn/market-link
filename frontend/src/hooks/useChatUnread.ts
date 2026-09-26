import { useSyncExternalStore } from 'react';
import { ChatUnreadStore } from '@/lib/chat/unreadStore';

/** FR-113: total unread messages, updating itself while on another page. */
const useChatUnread = () => useSyncExternalStore(ChatUnreadStore.subscribe, ChatUnreadStore.getUnread, () => 0);
export default useChatUnread;
