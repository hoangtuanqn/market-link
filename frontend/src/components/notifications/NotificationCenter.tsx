import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import NotificationApi from '@/api-requests/notification.requests';
import useSession from '@/hooks/useSession';
import {
  beep,
  permission,
  registerWorker,
  showOsNotification,
  syncPushSubscription,
} from '@/lib/notifications/browser';
import { NotificationStore } from '@/lib/notifications/store';
import { realtime } from '@/lib/realtime/stompClient';
import type { NotificationFrame } from '@/types/notification.types';

const DESTINATION = '/user/topic/notifications';
const CHAT_PATHS = ['/messages', '/farmer/messages'];

/** Đang mở đúng đoạn chat của tin này (?c=<id>) thì không bật popup. */
const isOpenThread = (frame: NotificationFrame, pathname: string, search: string) =>
  frame.kind === 'message' &&
  frame.conversationId !== null &&
  CHAT_PATHS.includes(pathname) &&
  new URLSearchParams(search).get('c') === String(frame.conversationId);

/**
 * FR-042 — nối STOMP khi có phiên, đóng khi đăng xuất. Mỗi khung: cập nhật chuông, báo cho trang danh sách, rồi theo
 * `alert` server tính: tab đang nhìn → toast; tab ẩn → thông báo hệ điều hành (nếu đã cho quyền).
 */
const NotificationCenter = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = user?.id;
  // đọc trang đang mở trong handler mà không subscribe lại STOMP mỗi lần chuyển trang
  const here = useRef(location);
  useEffect(() => {
    here.current = location;
  }, [location]);

  useEffect(() => {
    if (!userId) {
      NotificationStore.setUnread(0);
      return;
    }
    let cancelled = false;
    NotificationApi.unreadCount()
      .then((res) => !cancelled && NotificationStore.setUnread(res.data.count))
      .catch(() => {
        /* chưa có mạng: số sẽ tới cùng khung STOMP đầu tiên */
      });
    // đã cho quyền từ trước: đảm bảo máy này đang nhận Web Push cho đúng tài khoản vừa đăng nhập
    if (permission() === 'granted') void registerWorker().then(() => syncPushSubscription());
    realtime.start();
    return () => {
      cancelled = true;
      realtime.stop();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return realtime.subscribe(DESTINATION, (body) => {
      let frame: NotificationFrame;
      try {
        frame = JSON.parse(body) as NotificationFrame;
      } catch {
        return;
      }
      if (frame.persistent) NotificationStore.setUnread(frame.unreadCount);
      NotificationStore.emitFrame(frame);
      if (isOpenThread(frame, here.current.pathname, here.current.search)) return;

      if (document.visibilityState === 'visible') {
        if (!frame.alert.inApp) return;
        toast(frame.title, {
          description: frame.message,
          action: frame.link ? { label: t('notify.open'), onClick: () => navigate(frame.link!) } : undefined,
        });
        if (frame.alert.sound) beep();
      } else if (frame.alert.browser) {
        void showOsNotification(frame);
      }
    });
  }, [userId, navigate, t]);

  // Bấm thông báo của hệ điều hành khi tab đang mở: service worker nhờ tab này điều hướng
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'notification-open' && typeof e.data.link === 'string') navigate(e.data.link);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate]);

  return null;
};

export default NotificationCenter;
