import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import AdminFarmerApi from '@/api-requests/admin-farmer.requests';
import ChatApi, { type ChatResultDto, type PageContextDto, type ProposedActionDto } from '@/api-requests/chat.requests';
import OrderApi from '@/api-requests/order.requests';
import ChatMessage from '@/components/ChatMessage';
import { Button, ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import { USER_ROLE } from '@/constants/enums';
import useSession from '@/hooks/useSession';
import { useAssistant } from './assistantContext';
import { formatTime } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const MAX_LENGTH = 500;
const SUGGESTIONS = ['find', 'hours', 'stalls', 'cancel'] as const;

type Entry = {
  from: 'user' | 'bot';
  text: string;
  at: Date;
  intent?: string | null;
  results?: ChatResultDto[];
  actions?: ProposedActionDto[];
};

type Load = 'loading' | 'error' | 'ready';

const routePattern = (pathname: string) =>
  pathname
    .split('/')
    .filter(Boolean)
    .map((part) => (/^\d+$/.test(part) ? ':id' : /[0-9]/.test(part) ? ':code' : part.toLowerCase()))
    .join('/')
    .replace(/[^a-z/:-]/g, '')
    .slice(0, 64);

const ACTIONS: Record<
  ProposedActionDto['action'],
  { run?: (id: number) => Promise<unknown>; href?: (a: ProposedActionDto) => string }
> = {
  accept_order: { run: (id) => OrderApi.accept(id) },
  ready_order: { run: (id) => OrderApi.markReady(id) },
  complete_order: { run: (id) => OrderApi.complete(id) },
  approve_farmer: { run: (id) => AdminFarmerApi.approve(id) },
  decline_order: { href: (a) => `/farmer/orders/${a.id}` },
  reject_farmer: { href: (a) => `/admin/farmers/${a.id}` },
  suspend_farmer: { href: (a) => `/admin/farmers/${a.id}` },
};

const RESULT_PATH: Record<ChatResultDto['type'], string> = {
  product: '/products',
  market: '/markets',
  farmer: '/stalls',
  order: '/farmer/orders',
};

const resultPath = (r: ChatResultDto, role: string | undefined) =>
  r.type === 'farmer' && role === USER_ROLE.ADMIN ? `/admin/farmers/${r.id}` : `${RESULT_PATH[r.type]}/${r.id}`;

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

const intentLabel = (intent: string | null | undefined, ai: (tools: string) => string) => {
  if (!intent || intent === 'UNKNOWN' || intent === 'AI:none') return undefined;
  if (intent.startsWith('AI:')) return ai(intent.slice(3).split('+').join(', '));
  return intent;
};

const withBold = (text: string) =>
  text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part));

type AssistantChatProps = {
  className?: string;
};

const AssistantChat = ({ className }: AssistantChatProps) => {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const assistant = useAssistant();
  const record = assistant?.record ?? null;
  const cart = assistant?.cart ?? [];
  const [running, setRunning] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const confirmAction = async (key: string, action: ProposedActionDto) => {
    const run = ACTIONS[action.action]?.run;
    if (!run || running) return;
    setRunning(key);
    try {
      await run(action.id);
      setDone((prev) => ({ ...prev, [key]: true }));
      Notification.success({ title: t('assistant.action.doneTitle'), text: action.label });
    } catch {
      Notification.error({ title: t('assistant.action.failedTitle'), text: t('assistant.action.failedText') });
    } finally {
      setRunning(null);
    }
  };

  const { user } = useSession();
  const userId = user?.id;
  const [session, setSession] = useState<{ userId: number; key: string } | null>(null);
  if (userId !== undefined && session?.userId !== userId) {
    setSession({ userId, key: readSessionKey(userId) });
  }
  const sessionKey = userId !== undefined && session?.userId === userId ? session.key : null;
  const [log, setLog] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState<{ key: string; ok: boolean } | null>(null);
  const load: Load = !sessionKey || loaded?.key !== sessionKey ? 'loading' : loaded.ok ? 'ready' : 'error';
  const [localDraft, setLocalDraft] = useState('');
  const draft = assistant ? assistant.draft : localDraft;
  const setDraft = assistant ? assistant.setDraft : setLocalDraft;
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
      const context: PageContextDto = {
        page: routePattern(pathname) || undefined,
        recordType: record?.type,
        recordRef: record?.ref,
        cart: cart.length > 0 ? cart : undefined,
      };
      const data = await ChatApi.ask(sessionKey, message, context);
      if (data) {
        setLog((prev) => [
          ...prev,
          {
            from: 'bot',
            text: data.reply,
            at: new Date(),
            intent: data.intent,
            results: data.results,
            actions: data.actions,
          },
        ]);
      }
    } catch {
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
            {m.actions && m.actions.length > 0 && (
              <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
                {m.actions.map((a) => {
                  const spec = ACTIONS[a.action];
                  const key = `${a.action}:${a.id}`;
                  return (
                    <li key={key} className="bg-surface-sunken rounded-sm p-2 px-3">
                      <b className="block text-[14px]">{t(`assistant.action.${a.action}`, { label: a.label })}</b>
                      <span className="text-ink-muted block text-[13px]">{a.detail}</span>
                      <div className="mt-2">
                        {done[key] ? (
                          <span className="text-small text-success">{t('assistant.action.done')}</span>
                        ) : spec?.run ? (
                          <Button size="sm" disabled={running === key} onClick={() => confirmAction(key, a)}>
                            {t('assistant.action.confirm')}
                          </Button>
                        ) : spec?.href ? (
                          <ButtonLink size="sm" variant="secondary" to={spec.href(a)}>
                            {t('assistant.action.openPage')}
                          </ButtonLink>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {m.results && m.results.length > 0 && (
              <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
                {m.results.map((r) => (
                  <li key={`${r.type}:${r.id}`}>
                    <Link
                      to={resultPath(r, user?.role)}
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
