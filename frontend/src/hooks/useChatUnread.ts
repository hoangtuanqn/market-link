import { useSyncExternalStore } from 'react';
import { ChatUnreadStore } from '@/lib/chat/unreadStore';

/** FR-113: tổng số tin chưa đọc, tự cập nhật khi đang ở trang khác. */
const useChatUnread = () => useSyncExternalStore(ChatUnreadStore.subscribe, ChatUnreadStore.getUnread, () => 0);
export default useChatUnread;
