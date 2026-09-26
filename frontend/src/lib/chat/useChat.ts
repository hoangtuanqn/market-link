import { useCallback, useEffect, useRef, useState } from 'react';
import { applyConversationEvent, applyPresence, mergeMessage, oldestId, prependOlder } from './merge';
import ConversationApi from '@/api-requests/conversation.requests';
import { realtime } from '@/lib/realtime/stompClient';
import type {
  ChatMessageItem,
  ConversationEventFrame,
  ConversationSummary,
  PresenceFrame,
  TypingFrame,
} from '@/types/chat.types';
import Session from '@/utils/session';

const PAGE = 30;
const THREAD_PAGE = 20;
const MESSAGES = '/user/topic/messages';
const CONVERSATIONS = '/user/topic/conversations';
const TYPING = '/user/topic/typing';
const PRESENCE = '/user/topic/presence';
const TYPING_OUT = '/app/typing';
/** Bên kia tự tắt ba chấm sau 6 giây không nghe gì, nên còn gõ thì nhắc lại sớm hơn thế. */
const TYPING_REPEAT_MS = 3000;
const TYPING_TIMEOUT_MS = 6000;

const parse = <T>(body: string): T | null => {
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
};

/** Đánh dấu đã đọc là phụ: hỏng (429, rớt mạng) thì lần mở sau đánh dấu lại, không được làm hỏng màn đang đọc. */
const markRead = (conversationId: number) => {
  ConversationApi.markRead(conversationId).catch(() => {});
};

/** Thread đang mở thì badge là 0: backend chỉ báo "read" cho người kia, không báo cho chính người vừa đọc. */
const clearUnread = (threads: ConversationSummary[], activeId: number | null) =>
  activeId === null || !threads.some((t) => t.id === activeId && t.unreadCount !== 0)
    ? threads
    : threads.map((t) => (t.id === activeId ? { ...t, unreadCount: 0 } : t));

/**
 * Danh sách thread của người đang đăng nhập, tự nhảy lên đầu khi có tin mới. `activeId` là thread đang mở, để giữ badge
 * của nó ở 0.
 */
export function useThreadList(activeId: number | null = null) {
  const [threads, setThreads] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const threadsRef = useRef(threads);
  const activeRef = useRef(activeId);

  useEffect(() => {
    threadsRef.current = threads;
    activeRef.current = activeId;
  });

  // Vừa mở một thread: xoá badge ngay trong lần render này
  const [clearedFor, setClearedFor] = useState(activeId);
  if (clearedFor !== activeId) {
    setClearedFor(activeId);
    setThreads((current) => clearUnread(current, activeId));
  }

  const fetchList = useCallback(async () => {
    const response = await ConversationApi.list({ page: 1, size: THREAD_PAGE });
    setThreads(clearUnread(response.data.items, activeRef.current));
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      await fetchList();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  /** Tải bù không bật "đang tải": danh sách đang hiện vẫn đúng, chỉ thiếu vài cập nhật. Hỏng thì giữ nguyên. */
  const refresh = useCallback(() => {
    fetchList().catch(() => {});
  }, [fetchList]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải danh sách khi mở trang
    void reload();
  }, [reload]);

  useEffect(() => {
    realtime.start();
    const offEvents = realtime.subscribe(CONVERSATIONS, (body) => {
      const frame = parse<ConversationEventFrame>(body);
      if (!frame) return;
      // Thread chưa có trong danh sách (khách nhắn lần đầu): sự kiện không mang tên người gửi, phải tải lại
      if (frame.type === 'updated' && !threadsRef.current.some((t) => t.id === frame.conversationId)) {
        refresh();
        return;
      }
      setThreads((current) => clearUnread(applyConversationEvent(current, frame), activeRef.current));
    });
    const offPresence = realtime.subscribe(PRESENCE, (body) => {
      const frame = parse<PresenceFrame>(body);
      if (frame) setThreads((current) => applyPresence(current, frame));
    });
    const offConnect = realtime.onConnect(refresh);
    return () => {
      offEvents();
      offPresence();
      offConnect();
    };
  }, [refresh]);

  return { threads, loading, error, reload };
}

/** Một cuộc hội thoại đang mở. conversationId null = chưa chọn thread nào (màn 375px). */
export function useConversation(conversationId: number | null) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(conversationId !== null);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherReadAt, setOtherReadAt] = useState<string | null>(null);
  const meId = Session.getUser()?.id ?? null;
  const openRef = useRef(conversationId);
  const olderFor = useRef<number | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTyping = useRef<{ conversationId: number | null; on: boolean; at: number }>({
    conversationId: null,
    on: false,
    at: 0,
  });

  // Đổi thread thì bỏ ngay dữ liệu thread cũ, ngay trong lần render này chứ không đợi effect
  // (react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [shownFor, setShownFor] = useState(conversationId);
  if (shownFor !== conversationId) {
    setShownFor(conversationId);
    setMessages([]);
    setLoading(conversationId !== null);
    setError(false);
    setHasMore(false);
    setOlderError(false);
    setOtherTyping(false);
    setOtherReadAt(null);
  }

  // Phản hồi REST về muộn cho một thread đã rời thì bỏ. Effect chạy theo thứ tự khai báo: cái này trước mọi request.
  useEffect(() => {
    openRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (conversationId === null) return;
    const id = conversationId;
    let live = true;
    ConversationApi.messages(id, { size: PAGE })
      .then((response) => {
        if (!live) return;
        // API trả mới → cũ; state giữ cũ → mới
        setMessages([...response.data].reverse());
        setHasMore(response.data.length === PAGE);
        markRead(id);
      })
      .catch(() => {
        if (live) setError(true);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [conversationId]);

  useEffect(() => {
    if (conversationId === null) return;
    const id = conversationId;
    realtime.start();

    /**
     * Review Focus #3: broker không phát lại tin tới lúc rớt. Mỗi lần nối lại, GỘP trang mới nhất vào (không thay cả
     * danh sách, để trang cũ đã cuộn lên đọc vẫn còn). Rớt quá PAGE tin thì vẫn thủng một khoảng: chấp nhận ở 4A.
     */
    const catchUp = () => {
      ConversationApi.messages(id, { size: PAGE })
        .then((response) => {
          if (openRef.current !== id) return;
          setMessages((current) => prependOlder(current, response.data));
          setError(false);
          markRead(id);
        })
        .catch(() => {});
    };

    const offMessages = realtime.subscribe(MESSAGES, (body) => {
      const incoming = parse<ChatMessageItem>(body);
      if (!incoming || incoming.conversationId !== id) return;
      setMessages((current) => mergeMessage(current, incoming));
      if (incoming.senderId !== meId) {
        // Tin của họ đã tới thì họ đã ngừng gõ
        setOtherTyping(false);
        markRead(id);
      }
    });
    const offTyping = realtime.subscribe(TYPING, (body) => {
      const frame = parse<TypingFrame>(body);
      if (!frame || frame.conversationId !== id) return;
      setOtherTyping(frame.typing);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      // Người kia đóng tab giữa chừng thì ba chấm phải tự tắt
      if (frame.typing) typingTimer.current = setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT_MS);
    });
    // FR-112 "đã xem": backend chỉ gửi "read" cho người gửi, khi đối phương đọc
    const offRead = realtime.subscribe(CONVERSATIONS, (body) => {
      const frame = parse<ConversationEventFrame>(body);
      if (frame?.type === 'read' && frame.conversationId === id && frame.readAt) setOtherReadAt(frame.readAt);
    });
    const offConnect = realtime.onConnect(catchUp);

    return () => {
      offMessages();
      offTyping();
      offRead();
      offConnect();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      // Đang gõ dở mà rời thread: tắt ba chấm bên kia ngay, không bắt họ đợi 6 giây
      const last = lastTyping.current;
      if (last.on && last.conversationId === id) {
        realtime.publish(TYPING_OUT, { conversationId: id, typing: false });
        lastTyping.current = { conversationId: null, on: false, at: 0 };
      }
    };
  }, [conversationId, meId]);

  /** Không ném lỗi ra ngoài: hỏng thì bật `olderError`, tin đang đọc giữ nguyên, bấm lại là thử lại. */
  const loadOlder = useCallback(async () => {
    if (conversationId === null || messages.length === 0 || olderFor.current === conversationId) return;
    const id = conversationId;
    olderFor.current = id;
    setOlderError(false);
    try {
      const response = await ConversationApi.messages(id, { before: oldestId(messages), size: PAGE });
      if (openRef.current !== id) return;
      setMessages((current) => prependOlder(current, response.data));
      setHasMore(response.data.length === PAGE);
    } catch {
      if (openRef.current === id) setOlderError(true);
    } finally {
      if (olderFor.current === id) olderFor.current = null;
    }
  }, [conversationId, messages]);

  /** Lỗi gửi được ném ra cho Composer: nó giữ lại chữ đang gõ và báo lỗi, không nuốt mất tin. */
  const send = useCallback(
    async (body: string) => {
      if (conversationId === null) return;
      const id = conversationId;
      const response = await ConversationApi.send(id, { body });
      // Tin tới là bên kia tự tắt ba chấm; gõ tiếp thì typing(true) sẽ gửi lại ngay
      lastTyping.current = { conversationId: id, on: false, at: 0 };
      if (openRef.current === id) setMessages((current) => mergeMessage(current, response.data));
    },
    [conversationId],
  );

  const sendPhoto = useCallback(
    async (file: File) => {
      if (conversationId === null) return;
      const id = conversationId;
      const uploaded = await ConversationApi.uploadPhoto(file);
      const response = await ConversationApi.send(id, { kind: 'image', attachmentId: uploaded.data.attachmentId });
      if (openRef.current === id) setMessages((current) => mergeMessage(current, response.data));
    },
    [conversationId],
  );

  /**
   * Composer gọi ở mỗi phím. Server giới hạn 120 frame/phút và bỏ im lặng phần vượt, nên chỉ gửi khi trạng thái đổi,
   * hoặc nhắc lại "đang gõ" sau TYPING_REPEAT_MS.
   */
  const typing = useCallback(
    (on: boolean) => {
      if (conversationId === null) return;
      const now = Date.now();
      const last = lastTyping.current;
      if (!on && !last.on) return;
      if (on && last.on && last.conversationId === conversationId && now - last.at < TYPING_REPEAT_MS) return;
      lastTyping.current = { conversationId, on, at: now };
      realtime.publish(TYPING_OUT, { conversationId, typing: on });
    },
    [conversationId],
  );

  return {
    messages,
    loading,
    error,
    hasMore,
    loadOlder,
    olderError,
    send,
    sendPhoto,
    typing,
    otherTyping,
    otherReadAt,
    meId,
  };
}
