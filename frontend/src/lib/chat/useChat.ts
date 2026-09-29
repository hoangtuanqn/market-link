import { useCallback, useEffect, useRef, useState } from 'react';
import { applyConversationEvent, applyPresence, mergeMessage, oldestId, prependOlder, removeMessage } from './merge';
import ConversationApi from '@/api-requests/conversation.requests';
import { ChatUnreadStore } from '@/lib/chat/unreadStore';
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
const TYPING_REPEAT_MS = 3000;
const TYPING_TIMEOUT_MS = 6000;

const parse = <T>(body: string): T | null => {
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
};

const markRead = (conversationId: number) => {
  ConversationApi.markRead(conversationId)
    .then(() => ConversationApi.unreadCount())
    .then((response) => ChatUnreadStore.setUnread(response.data.count))
    .catch(() => {});
};

const clearUnread = (threads: ConversationSummary[], activeId: number | null) =>
  activeId === null || !threads.some((t) => t.id === activeId && t.unreadCount !== 0)
    ? threads
    : threads.map((t) => (t.id === activeId ? { ...t, unreadCount: 0 } : t));

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

  const [clearedFor, setClearedFor] = useState(activeId);
  if (clearedFor !== activeId) {
    setClearedFor(activeId);
    setThreads((current) => clearUnread(current, activeId));
  }

  const [total, setTotal] = useState(0);
  const pageRef = useRef(1);

  const fetchList = useCallback(async () => {
    const response = await ConversationApi.list({ page: 1, size: THREAD_PAGE });
    pageRef.current = 1;
    setThreads(clearUnread(response.data.items, activeRef.current));
    setTotal(response.data.total);
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

  const refresh = useCallback(() => {
    fetchList().catch(() => {});
  }, [fetchList]);

  const [loadingMore, setLoadingMore] = useState(false);
  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const response = await ConversationApi.list({ page: next, size: THREAD_PAGE });
      pageRef.current = next;
      setThreads((current) => {
        const have = new Set(current.map((t) => t.id));
        return clearUnread([...current, ...response.data.items.filter((t) => !have.has(t.id))], activeRef.current);
      });
      setTotal(response.data.total);
    } catch {
      /* unchanged; clicking again retries */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore]);
  const hasMore = threads.length < total;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the list when the page opens
    void reload();
  }, [reload]);

  useEffect(() => {
    realtime.start();
    const offEvents = realtime.subscribe(CONVERSATIONS, (body) => {
      const frame = parse<ConversationEventFrame>(body);
      if (!frame) return;
      if (frame.type === 'updated' && !threadsRef.current.some((t) => t.id === frame.conversationId)) {
        refresh();
        return;
      }
      if (frame.type === 'hidden') {
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

  return { threads, loading, error, reload, hasMore, loadMore, loadingMore };
}

export function useConversation(conversationId: number | null, opts: { otherReadAt?: string } = {}) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(conversationId !== null);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherReadAt, setOtherReadAt] = useState<string | null>(opts.otherReadAt ?? null);
  const meId = Session.getUser()?.id ?? null;
  const openRef = useRef(conversationId);
  const olderFor = useRef<number | null>(null);
  const pendingRead = useRef<number | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTyping = useRef<{ conversationId: number | null; on: boolean; at: number }>({
    conversationId: null,
    on: false,
    at: 0,
  });

  const [shownFor, setShownFor] = useState(conversationId);
  if (shownFor !== conversationId) {
    setShownFor(conversationId);
    setMessages([]);
    setLoading(conversationId !== null);
    setError(false);
    setHasMore(false);
    setOlderError(false);
    setOtherTyping(false);
    setOtherReadAt(opts.otherReadAt ?? null);
  }

  const seed = opts.otherReadAt ?? null;
  const [seededFrom, setSeededFrom] = useState(seed);
  if (seed !== seededFrom) {
    setSeededFrom(seed);
    if (seed && (!otherReadAt || Date.parse(seed) > Date.parse(otherReadAt))) setOtherReadAt(seed);
  }

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
        setMessages([...response.data].reverse());
        setHasMore(response.data.length === PAGE);
        if (document.visibilityState === 'visible') markRead(id);
        else pendingRead.current = id;
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

    const catchUp = () => {
      ConversationApi.messages(id, { size: PAGE })
        .then((response) => {
          if (openRef.current !== id) return;
          setMessages((current) => prependOlder(current, response.data));
          setError(false);
          if (document.visibilityState === 'visible') markRead(id);
          else pendingRead.current = id;
        })
        .catch(() => {});
    };

    const offMessages = realtime.subscribe(MESSAGES, (body) => {
      const incoming = parse<ChatMessageItem>(body);
      if (!incoming || incoming.conversationId !== id) return;
      setMessages((current) => mergeMessage(current, incoming));
      if (incoming.senderId !== meId) {
        setOtherTyping(false);
        if (document.visibilityState === 'visible') markRead(id);
        else pendingRead.current = id;
      }
    });
    const offTyping = realtime.subscribe(TYPING, (body) => {
      const frame = parse<TypingFrame>(body);
      if (!frame || frame.conversationId !== id) return;
      setOtherTyping(frame.typing);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (frame.typing) typingTimer.current = setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT_MS);
    });
    const offRead = realtime.subscribe(CONVERSATIONS, (body) => {
      const frame = parse<ConversationEventFrame>(body);
      if (frame?.type === 'read' && frame.conversationId === id && frame.readAt) setOtherReadAt(frame.readAt);
      if (frame?.type === 'hidden' && frame.conversationId === id && frame.messageId) {
        setMessages((c) => removeMessage(c, frame.messageId!));
      }
    });
    const offConnect = realtime.onConnect(catchUp);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && pendingRead.current === id) {
        pendingRead.current = null;
        markRead(id);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      offMessages();
      offTyping();
      offRead();
      offConnect();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      const last = lastTyping.current;
      if (last.on && last.conversationId === id) {
        realtime.publish(TYPING_OUT, { conversationId: id, typing: false });
        lastTyping.current = { conversationId: null, on: false, at: 0 };
      }
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [conversationId, meId]);

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

  const send = useCallback(
    async (body: string, extra: { productId?: number; orderId?: number } = {}) => {
      if (conversationId === null) return;
      const id = conversationId;
      const response = await ConversationApi.send(id, { body, ...extra });
      lastTyping.current = { conversationId: id, on: false, at: 0 };
      if (openRef.current === id) setMessages((current) => mergeMessage(current, response.data));
    },
    [conversationId],
  );

  const sendMedia = useCallback(
    async (file: File, options: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {}) => {
      if (conversationId === null) return;
      const id = conversationId;
      const uploaded = await ConversationApi.uploadMedia(file, options);
      const kind = uploaded.data.mime.startsWith('video/') ? 'video' : 'image';
      const response = await ConversationApi.send(id, { kind, attachmentId: uploaded.data.attachmentId });
      if (openRef.current === id) setMessages((current) => mergeMessage(current, response.data));
    },
    [conversationId],
  );

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
    sendMedia,
    typing,
    otherTyping,
    otherReadAt,
    meId,
  };
}
