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
 * Một kết nối STOMP cho cả app (thông báo FR-042 và về sau chat Plan 4). JWT gửi ở frame CONNECT
 * (StompAuthInterceptor). Trước mỗi lần nối gọi một API riêng tư: token hết hạn thì interceptor axios refresh xong mới
 * đọc token, nên nối lại sau khi mở tab lâu không kẹt ở token cũ.
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
          /* mất mạng hoặc hết phiên: vẫn thử nối, lần sau thử lại */
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
   * Chạy mỗi lần nối (hoặc nối lại) xong. Broker không phát lại những gì tới lúc rớt — kể cả khi backend khởi động lại
   * mà mạng máy vẫn còn, lúc đó trình duyệt không bắn sự kiện `online` — nên ai giữ dữ liệu realtime thì tải bù ở đây.
   */
  onConnect(listener: () => void) {
    connectListeners.add(listener);
    return () => {
      connectListeners.delete(listener);
    };
  },

  /** Gửi một frame lên server (chat: /app/typing). Chưa nối thì bỏ: tín hiệu thoáng qua, không đáng xếp hàng chờ. */
  publish(destination: string, body: unknown) {
    if (client?.connected) client.publish({ destination, body: JSON.stringify(body) });
  },

  /** Nghe một đích; trả hàm huỷ. Gọi trước hay sau khi nối đều được. */
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
