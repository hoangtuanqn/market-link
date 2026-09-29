import { useSyncExternalStore } from 'react';
import { ChatUnreadStore } from '@/lib/chat/unreadStore';

const useChatUnread = () => useSyncExternalStore(ChatUnreadStore.subscribe, ChatUnreadStore.getUnread, () => 0);
export default useChatUnread;
