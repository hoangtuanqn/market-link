import { useCallback, useEffect, useRef, useState } from 'react';
import { applyConversationEvent, mergeMessage, oldestId, prependOlder } from './merge';
import ConversationApi from '@/api-requests/conversation.requests';
import { realtime } from '@/lib/realtime/stompClient';
import type { ChatMessageItem, ConversationEventFrame, ConversationSummary, TypingFrame } from '@/types/chat.types';
import Session from '@/utils/session';

const PAGE = 30;
const MESSAGES = '/user/topic/messages';
const CONVERSATIONS = '/user/topic/conversations';
const TYPING = '/user/topic/typing';
const TYPING_OUT = '/app/typing';
/** Bên kia tự tắt ba chấm sau 6 giây không nghe gì, nên còn gõ thì nhắc lại sớm hơn thế. */
const TYPING_REPEAT_MS = 3000;

const parse = <T>(body: string): T | null => {
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
};

/** Danh sách thread của người đang đăng nhập, tự nhảy lên đầu khi có tin mới. */
export function useThreadList() {
  const [threads, setThreads] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await ConversationApi.list({ page: 1, size: 20 });
      setThreads(response.data.items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải danh sách khi mở trang
    void reload();
  }, [reload]);

  useEffect(() => {
    realtime.start();
    return realtime.subscribe(CONVERSATIONS, (body) => {
      const frame = parse<ConversationEventFrame>(body);
      if (frame) setThreads((current) => applyConversationEvent(current, frame));
    });
  }, []);

  return { threads, loading, error, reload };
}

/** Một cuộc hội thoại đang mở. conversationId null = chưa chọn thread nào (màn 375px). */
export function useConversation(conversationId: number | null) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const meId = Session.getUser()?.id ?? null;
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
    setHasMore(false);
    setOtherTyping(false);
  }

  const loadNewest = useCallback(async () => {
    if (conversationId === null) return;
    setLoading(true);
    setError(false);
    try {
      const response = await ConversationApi.messages(conversationId, { size: PAGE });
      // API trả mới → cũ; state giữ cũ → mới
      setMessages([...response.data].reverse());
      setHasMore(response.data.length === PAGE);
      await ConversationApi.markRead(conversationId);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải trang mới nhất khi mở thread
    void loadNewest();
  }, [loadNewest]);

  /**
   * Review Focus #3: STOMP tự nối lại sau 5 giây nhưng KHÔNG phát lại những tin tới lúc rớt. Mạng về thì tải lại trang
   * mới nhất, nếu không thread sẽ thủng một khoảng mà không ai biết.
   */
  useEffect(() => {
    const onBack = () => void loadNewest();
    globalThis.addEventListener('online', onBack);
    return () => globalThis.removeEventListener('online', onBack);
  }, [loadNewest]);

  useEffect(() => {
    if (conversationId === null) return;
    realtime.start();
    const offMessages = realtime.subscribe(MESSAGES, (body) => {
      const incoming = parse<ChatMessageItem>(body);
      if (!incoming || incoming.conversationId !== conversationId) return;
      setMessages((current) => mergeMessage(current, incoming));
      if (incoming.senderId !== meId) void ConversationApi.markRead(conversationId);
    });
    const offTyping = realtime.subscribe(TYPING, (body) => {
      const frame = parse<TypingFrame>(body);
      if (!frame || frame.conversationId !== conversationId) return;
      setOtherTyping(frame.typing);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      // Người kia đóng tab giữa chừng thì ba chấm phải tự tắt
      if (frame.typing) typingTimer.current = setTimeout(() => setOtherTyping(false), 6000);
    });
    return () => {
      offMessages();
      offTyping();
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [conversationId, meId]);

  const loadOlder = useCallback(async () => {
    if (conversationId === null || messages.length === 0) return;
    const before = oldestId(messages);
    const response = await ConversationApi.messages(conversationId, { before, size: PAGE });
    setMessages((current) => prependOlder(current, response.data));
    setHasMore(response.data.length === PAGE);
  }, [conversationId, messages]);

  const send = useCallback(
    async (body: string) => {
      if (conversationId === null) return;
      const response = await ConversationApi.send(conversationId, { body });
      setMessages((current) => mergeMessage(current, response.data));
    },
    [conversationId],
  );

  const sendPhoto = useCallback(
    async (file: File) => {
      if (conversationId === null) return;
      const uploaded = await ConversationApi.uploadPhoto(file);
      const response = await ConversationApi.send(conversationId, {
        kind: 'image',
        attachmentId: uploaded.data.attachmentId,
      });
      setMessages((current) => mergeMessage(current, response.data));
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

  return { messages, loading, error, hasMore, loadOlder, send, sendPhoto, typing, otherTyping, meId };
}
