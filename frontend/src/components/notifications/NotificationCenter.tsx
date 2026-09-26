import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import AuthApi from '@/api-requests/auth.requests';
import NotificationApi from '@/api-requests/notification.requests';
import useSession from '@/hooks/useSession';
import {
  beep,
  permission,
  registerWorker,
  showOsNotification,
  syncPushSubscription,
} from '@/lib/notifications/browser';
import { FARMER_DECISION_KINDS, NotificationStore } from '@/lib/notifications/store';
import { realtime } from '@/lib/realtime/stompClient';
import type { NotificationFrame } from '@/types/notification.types';
import Session from '@/utils/session';

const DESTINATION = '/user/topic/notifications';

/**
 * The user stored in the browser is only updated at sign-in / token refresh. When an Admin approves an application the
 * role changes on the server right away (Farmer menu, the /farmer area) — re-read the profile so the UI catches up,
 * without waiting for the token to expire.
 */
const refreshUser = () =>
  AuthApi.getMe()
    .then((res) => Session.updateUser(res.data))
    .catch(() => {
      /* no network: the next time the app opens it will read again */
    });
const CHAT_PATHS = ['/messages', '/farmer/messages'];

/** When the exact chat thread of this message is open (?c=<id>) do not pop up. */
const isOpenThread = (frame: NotificationFrame, pathname: string, search: string) =>
  frame.kind === 'message' &&
  frame.conversationId !== null &&
  CHAT_PATHS.includes(pathname) &&
  new URLSearchParams(search).get('c') === String(frame.conversationId);

/**
 * FR-042 — connect STOMP when there is a session, close on sign-out. Each frame: update the bell, tell the list page,
 * then follow the `alert` the server computed: tab in view → toast; tab hidden → OS notification (if permission was
 * given).
 */
const NotificationCenter = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = user?.id;
  // read the open page inside the handler without re-subscribing STOMP on every page change
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
        /* no network yet: the count will arrive with the first STOMP frame */
      });
    // a decision may arrive while the tab was closed: on opening the app read the role again
    void refreshUser();
    // permission was already granted: make sure this machine is receiving Web Push for the account that just signed in
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
      if (FARMER_DECISION_KINDS.includes(frame.kind)) void refreshUser();
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

  // Clicking an OS notification while the tab is open: the service worker asks this tab to navigate
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
