import { useEffect, useRef } from 'react';
import ConversationApi from '@/api-requests/conversation.requests';
import useSession from '@/hooks/useSession';
import { ChatUnreadStore } from '@/lib/chat/unreadStore';
import { realtime } from '@/lib/realtime/stompClient';

export default function ChatUnreadCenter() {
  const { user } = useSession();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) {
      ChatUnreadStore.setUnread(0);
      return;
    }

    let alive = true;

    const refresh = async () => {
      try {
        const response = await ConversationApi.unreadCount();
        if (alive) {
          ChatUnreadStore.setUnread(response.data.count);
        }
      } catch {
        // Silently fail for background refresh
      }
    };

    void refresh();

    const offConnect = realtime.onConnect(() => {
      void refresh();
    });

    const offSubscribe = realtime.subscribe('/user/topic/conversations', () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void refresh();
      }, 300);
    });

    return () => {
      alive = false;
      offConnect();
      offSubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [user]);

  return null;
}
