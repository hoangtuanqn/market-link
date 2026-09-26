import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import NotificationApi from '@/api-requests/notification.requests';
import Session from '@/utils/session';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const WS_URL = `${API_URL.replace(/^http/, 'ws')}/ws`;

type Handler = (body: string) => void;

const handlers = new Map<string, Set<Handler>>();
const subscriptions = new Map<string, StompSubscription>();
const connectListeners = new Set<() => void>();
let client: Client | null = null;

const attach = (destination: string) => {
  if (!client?.connected || subscriptions.has(destination)) return;
  subscriptions.set(
    destination,
    client.subscribe(destination, (m: IMessage) => handlers.get(destination)?.forEach((h) => h(m.body))),
  );
};

/**
 * One STOMP connection for the whole app (FR-042 notifications and later Plan 4 chat). The JWT is sent in the CONNECT
 * frame (StompAuthInterceptor). Before each connect call a private API: if the token expired the axios interceptor
 * refreshes and only then reads the token, so reconnecting after a tab was open a long time does not get stuck on the
 * old token.
 */
export const realtime = {
  start() {
    if (client) return;
    client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      beforeConnect: async (c) => {
        try {
          await NotificationApi.unreadCount();
        } catch {
          /* no network or session ended: still try to connect, retry next time */
        }
        c.connectHeaders = { Authorization: `Bearer ${Session.getAccessToken() ?? ''}` };
      },
      onConnect: () => {
        subscriptions.clear();
        handlers.forEach((_, destination) => attach(destination));
        connectListeners.forEach((listener) => listener());
      },
      onWebSocketClose: () => subscriptions.clear(),
    });
    client.activate();
  },

  stop() {
    const current = client;
    client = null;
    subscriptions.clear();
    void current?.deactivate();
  },

  /**
   * Runs after every connect (or reconnect). The broker does not replay what was missed during a drop — even when the
   * backend restarts while the machine's network stays up, in which case the browser never fires an `online` event — so
   * whoever holds realtime data must catch up here.
   */
  onConnect(listener: () => void) {
    connectListeners.add(listener);
    return () => {
      connectListeners.delete(listener);
    };
  },

  /** Sends one frame to the server (chat: /app/typing). Skipped if not connected: a transient signal, not worth queuing. */
  publish(destination: string, body: unknown) {
    if (client?.connected) client.publish({ destination, body: JSON.stringify(body) });
  },

  /** Listen to a destination; returns an unsubscribe function. Can be called before or after connecting. */
  subscribe(destination: string, handler: Handler) {
    if (!handlers.has(destination)) handlers.set(destination, new Set());
    handlers.get(destination)!.add(handler);
    attach(destination);
    return () => {
      const set = handlers.get(destination);
      set?.delete(handler);
      if (set && set.size === 0) {
        subscriptions.get(destination)?.unsubscribe();
        subscriptions.delete(destination);
        handlers.delete(destination);
      }
    };
  },
};
