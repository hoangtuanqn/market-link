import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import ChatApi, { type ChatResultDto } from '@/api-requests/chat.requests';
import ChatMessage from '@/components/ChatMessage';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import useSession from '@/hooks/useSession';
import { formatTime } from '@/lib/format';
import Helper from '@/utils/helper';

/** Same limit as ChatRequest on the server. */
const MAX_LENGTH = 500;
const SUGGESTIONS = ['find', 'hours', 'stalls', 'cancel'] as const;

type Entry = {
  from: 'user' | 'bot';
  text: string;
  at: Date;
  intent?: string | null;
  results?: ChatResultDto[];
};

type Load = 'loading' | 'error' | 'ready';

const RESULT_PATH: Record<ChatResultDto['type'], string> = {
  product: '/products',
  market: '/markets',
  farmer: '/stalls',
};

/** One conversation per account and browser; "New conversation" swaps the key (the server keeps the old rows). */
const storageKey = (userId: number) => `ml-assistant:${userId}`;

const readSessionKey = (userId: number) => {
  try {
    const saved = localStorage.getItem(storageKey(userId));
    if (saved) return saved;
  } catch {
    // private window: a fresh key per page load is fine
  }
  return newSessionKey(userId);
};

const newSessionKey = (userId: number) => {
  // randomUUID only exists in secure contexts (HTTPS / localhost); plain HTTP falls back to 16 random bytes in hex
  const key =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  try {
    localStorage.setItem(storageKey(userId), key);
  } catch {
    // private window
  }
  return key;
};

/**
 * The chip under a bot reply (FR-092): the keyword engine's intent, or the tools Claude called ("AI:search_products").
 * Nothing when no lookup was needed.
 */
const intentLabel = (intent: string | null | undefined, ai: (tools: string) => string) => {
  if (!intent || intent === 'UNKNOWN' || intent === 'AI:none') return undefined;
  if (intent.startsWith('AI:')) return ai(intent.slice(3).split('+').join(', '));
  return intent;
};

/**
 * The model sometimes marks a button name as **Cancel order** despite being asked for plain text: show it bold instead
 * of the raw asterisks. Built from React elements, so the text is never parsed as HTML.
 */
const withBold = (text: string) =>
  text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part));

type AssistantChatProps = {
  /** Height of the whole block; the message list scrolls inside it. */
  className?: string;
};

/**
 * FR-090…092 — the customer's assistant: history on open, send, and result cards that link to the product, market or
 * stall. Claude answers signed-in customers; the server falls back to the keyword engine on its own.
 */
const AssistantChat = ({ className }: AssistantChatProps) => {
  const { t } = useTranslation('common');
  const { user } = useSession();
  const userId = user?.id;
  // Derived from the account during render (not in an effect): another account signing in gets its own conversation
  const [session, setSession] = useState<{ userId: number; key: string } | null>(null);
  if (userId !== undefined && session?.userId !== userId) {
    setSession({ userId, key: readSessionKey(userId) });
  }
  const sessionKey = userId !== undefined && session?.userId === userId ? session.key : null;
  const [log, setLog] = useState<Entry[]>([]);
  // Which key's history has answered, and how; any other key is still loading
  const [loaded, setLoaded] = useState<{ key: string; ok: boolean } | null>(null);
  const load: Load = !sessionKey || loaded?.key !== sessionKey ? 'loading' : loaded.ok ? 'ready' : 'error';
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /** Loads a key's stored messages; `isStale()` drops an answer that arrives after the key has changed. */
  const fetchHistory = useCallback((key: string, isStale: () => boolean = () => false) => {
    ChatApi.history(key)
      .then((data) => {
        if (isStale()) return;
        setLog(
          (data ?? []).map((m) => ({
            from: m.role === 'user' ? 'user' : 'bot',
            text: m.message,
            at: new Date(m.createdAt),
            intent: m.role === 'bot' ? m.intent : undefined,
          })),
        );
        setLoaded({ key, ok: true });
      })
      .catch(() => {
        if (!isStale()) setLoaded({ key, ok: false });
      });
  }, []);

  useEffect(() => {
    if (!sessionKey) return;
    let stale = false;
    fetchHistory(sessionKey, () => stale);
    return () => {
      stale = true;
    };
  }, [sessionKey, fetchHistory]);

  const retryHistory = () => {
    if (!sessionKey) return;
    setLoaded(null);
    fetchHistory(sessionKey);
  };

  // Keep the newest message in view
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [log, sending]);

  const ask = async (text: string) => {
    const message = text.trim().slice(0, MAX_LENGTH);
    if (!message || !sessionKey || sending) return;
    setSendFailed(null);
    setDraft('');
    setLog((prev) => [...prev, { from: 'user', text: message, at: new Date() }]);
    setSending(true);
    try {
      const data = await ChatApi.ask(sessionKey, message);
      if (data) {
        setLog((prev) => [
          ...prev,
          { from: 'bot', text: data.reply, at: new Date(), intent: data.intent, results: data.results },
        ]);
      }
    } catch {
      // Keep what they typed so they can send it again
      setLog((prev) => prev.slice(0, -1));
      setDraft(message);
      setSendFailed(message);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(draft);
  };

  const startOver = () => {
    if (userId === undefined) return;
    // The new key reloads an (empty) history through the effect above
    setSession({ userId, key: newSessionKey(userId) });
    setLog([]);
    setSendFailed(null);
  };

  return (
    <div className={Helper.cn('grid min-h-0 grid-rows-[auto_1fr_auto]', className)}>
      <div className="border-line-strong flex items-center justify-between gap-3 border-b-[1.5px] p-3 px-4">
        <div className="min-w-0">
          <b className="block">{t('chat.assistant')}</b>
          <span className="text-small text-ink-muted block">{t('assistant.note')}</span>
        </div>
        {log.length > 0 && (
          <Button variant="ghost" size="sm" onClick={startOver} disabled={sending}>
            {t('assistant.newChat')}
          </Button>
        )}
      </div>

      <div ref={listRef} className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        {load === 'loading' && <p className="text-small text-ink-muted m-0">{t('assistant.loading')}</p>}

        {load === 'error' && (
          <DataState
            variant="error"
            title={t('assistant.loadErrorTitle')}
            text={t('assistant.loadErrorText')}
            action={
              <Button variant="secondary" size="sm" onClick={retryHistory}>
                {t('chat.tryAgain')}
              </Button>
            }
          />
        )}

        {load === 'ready' && log.length === 0 && !sending && (
          <div className="flex flex-col gap-3">
            <DataState title={t('assistant.emptyTitle')} text={t('assistant.emptyText')} />
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Chip key={s} onClick={() => void ask(t(`assistant.suggest.${s}`))}>
                  {t(`assistant.suggest.${s}`)}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {log.map((m, i) => (
          <ChatMessage
            key={i}
            from={m.from}
            time={formatTime(m.at)}
            intent={m.from === 'bot' ? intentLabel(m.intent, (tools) => t('assistant.aiTools', { tools })) : undefined}
          >
            <span className="whitespace-pre-line">{withBold(m.text)}</span>
            {m.results && m.results.length > 0 && (
              <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
                {m.results.map((r) => (
                  <li key={`${r.type}:${r.id}`}>
                    <Link
                      to={`${RESULT_PATH[r.type]}/${r.id}`}
                      className="bg-surface-sunken text-ink hover:border-ink block rounded-sm border-[1.5px] border-transparent p-2 px-3 text-[14px] no-underline"
                    >
                      <span className="text-ink-muted block text-[12px] font-bold">
                        {t(`assistant.result.${r.type}`)}
                      </span>
                      <b className="block">{r.title}</b>
                      {r.subtitle && <span className="text-ink-muted block text-[13px]">{r.subtitle}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ChatMessage>
        ))}

        {sending && (
          <ChatMessage from="bot">
            <span className="text-ink-muted">{t('assistant.thinking')}</span>
          </ChatMessage>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-line-strong flex flex-col gap-2 border-t-[1.5px] p-3 px-4">
        {sendFailed && (
          <p role="alert" className="text-small text-danger m-0">
            {t('assistant.sendError')}
          </p>
        )}
        <div className="flex items-center gap-2">
          <label htmlFor="assistant-q" className="sr-only">
            {t('assistant.message')}
          </label>
          <input
            id="assistant-q"
            value={draft}
            maxLength={MAX_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('assistant.placeholder')}
            disabled={!sessionKey}
            className="border-line-strong bg-surface-raised text-body focus-visible:border-focus focus-visible:outline-focus min-h-11 min-w-0 flex-1 rounded-sm border-[1.5px] px-3 focus-visible:outline-2 focus-visible:outline-offset-1"
          />
          <Button type="submit" disabled={sending || !draft.trim() || !sessionKey}>
            {sending ? t('assistant.sending') : t('assistant.send')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AssistantChat;
