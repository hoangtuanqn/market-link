import { useCallback, useEffect, useRef, useState } from 'react';
import { applyConversationEvent, applyPresence, mergeMessage, oldestId, prependOlder, removeMessage } from './merge';
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
/** The other side turns off their three dots after 6 seconds of silence, so keep typing repeats sooner than that. */
const TYPING_REPEAT_MS = 3000;
const TYPING_TIMEOUT_MS = 6000;

const parse = <T>(body: string): T | null => {
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
};

/**
 * Marking as read is secondary: if it fails (429, network drop), the next open marks it again — it must not break the
 * screen being read.
 */
const markRead = (conversationId: number) => {
  ConversationApi.markRead(conversationId).catch(() => {});
};

/** An open thread's badge is 0: the backend only reports "read" to the other person, not to the one who just read. */
const clearUnread = (threads: ConversationSummary[], activeId: number | null) =>
  activeId === null || !threads.some((t) => t.id === activeId && t.unreadCount !== 0)
    ? threads
    : threads.map((t) => (t.id === activeId ? { ...t, unreadCount: 0 } : t));

/**
 * The signed-in user's thread list, jumping to the top by itself on a new message. `activeId` is the open thread, to
 * keep its badge at 0.
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

  // A thread was just opened: clear its badge right in this render
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

  /**
   * Catching up does not turn on "loading": the list already shown is still correct, just missing a few updates. On
   * failure, leave it as is.
   */
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
      // A thread jumping to the top between two pages can appear twice: dedupe by id
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
      // A thread not yet in the list (a customer's first message): the event carries no sender name, so reload
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

/** One open conversation. conversationId null = no thread selected (the 375px screen). */
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

  // Changing thread drops the old thread's data right in this render, not waiting for an effect
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
    setOtherReadAt(opts.otherReadAt ?? null);
  }

  // A REST response arriving late for a thread already left is dropped. Effects run in declaration order: this one before any request.
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
        // The API returns newest → oldest; state keeps oldest → newest
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

    /**
     * Review Focus #3: the broker does not replay what was missed during a drop. On every reconnect, MERGE the newest
     * page in (not replacing the whole list, so an old page already scrolled up to is kept). Dropping more than PAGE
     * messages still leaves a gap: accepted in 4A.
     */
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
        // Their message arriving means they stopped typing
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
      // If the other person closes the tab mid-typing, the three dots must turn off by themselves
      if (frame.typing) typingTimer.current = setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT_MS);
    });
    // FR-112 "seen": the backend only sends "read" to the sender, when the other person reads
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
      // Leaving mid-typing: turn off the other side's three dots right away, do not make them wait 6 seconds
      const last = lastTyping.current;
      if (last.on && last.conversationId === id) {
        realtime.publish(TYPING_OUT, { conversationId: id, typing: false });
        lastTyping.current = { conversationId: null, on: false, at: 0 };
      }
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [conversationId, meId]);

  /** Does not throw outward: on failure `olderError` turns on, messages already read stay put, clicking again retries. */
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

  /**
   * A send failure is thrown to Composer: it keeps the typed text and reports the error, without swallowing the
   * message.
   */
  const send = useCallback(
    async (body: string, extra: { productId?: number; orderId?: number } = {}) => {
      if (conversationId === null) return;
      const id = conversationId;
      const response = await ConversationApi.send(id, { body, ...extra });
      // A message arriving means the other side turned off their own three dots; typing more sends typing(true) again right away
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
   * Composer calls this on every keystroke. The server caps it at 120 frames/minute and silently drops the rest, so
   * only send when the state changes, or repeat "typing" after TYPING_REPEAT_MS.
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
