import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import ChatApi, { type ChatResultDto } from '@/api-requests/chat.requests';
import ChatMessage from '@/components/ChatMessage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import { formatTime } from '@/lib/format';

const SUGGESTIONS = ['baChieuHours', 'pomeloStock', 'benThanhSat', 'utHienPickup'] as const;

type LogEntry = {
  from: 'user' | 'bot';
  time: string;
  intent?: string;
  text: string;
  results?: ChatResultDto[];
};

const CAN_ANSWER = ['product', 'hours', 'stalls', 'slots', 'price'] as const;

/** "FIND_PRODUCT" → "find product", shown under a bot reply. */
const intentLabel = (intent: string) => intent.toLowerCase().replace(/_/g, ' ');

/** A chat result points at the real page for what it names (R-04: the assistant only ever reads). */
const resultHref = (result: ChatResultDto) => {
  switch (result.type) {
    case 'product':
      return `/products/${result.id}`;
    case 'market':
      return `/markets/${result.id}`;
    case 'farmer':
      return `/stalls/${result.id}`;
  }
};

/** A per-browser session id so a guest's chat history survives a reload without signing in. */
const readSessionKey = () => {
  try {
    const existing = localStorage.getItem('ml.chat.session');
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem('ml.chat.session', created);
    return created;
  } catch {
    return Math.random().toString(36).slice(2);
  }
};

/**
 * FR-090 FR-091 FR-092 — intent → prepared query with parameters run on the server, never LLM-generated SQL (R-04).
 * Mirror-until-edited: `history` is what the server already has for this session; `sent` is what happened this visit.
 * Nothing here is written from inside an effect.
 */
const CustomerAssistantPage = () => {
  const { t } = useTranslation('CustomerAssistant');
  const [sessionKey] = useState(readSessionKey);
  const { state, retry } = useRequest(`chat:${sessionKey}`, () => ChatApi.history(sessionKey));

  const [sent, setSent] = useState<LogEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const history: LogEntry[] =
    state.kind === 'ready'
      ? state.data.map((m) => ({
          from: m.role,
          time: formatTime(new Date(m.createdAt)),
          intent: m.intent ? intentLabel(m.intent) : undefined,
          text: m.message,
        }))
      : [];
  const log = [...history, ...sent];

  const send = async (text: string) => {
    const value = text.trim();
    if (!value || sending) return;
    setSent((prev) => [...prev, { from: 'user', time: formatTime(new Date()), text: value }]);
    setSending(true);
    try {
      const r = await ChatApi.ask(sessionKey, value);
      setSent((prev) => [
        ...prev,
        {
          from: 'bot',
          time: formatTime(new Date()),
          intent: intentLabel(r.intent),
          text: r.reply,
          results: r.results,
        },
      ]);
    } catch {
      setSent((prev) => [...prev, { from: 'bot', time: formatTime(new Date()), text: t('error') }]);
    } finally {
      setSending(false);
    }
  };

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    const value = draft;
    setDraft('');
    void send(value);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg max-w-155">{t('intro')}</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section
          aria-label={t('conversation')}
          className="border-line-strong bg-surface-raised shadow-tag grid h-160 grid-rows-[auto_1fr_auto] rounded-md border-[1.5px]"
        >
          <div className="border-line-strong flex items-center justify-between gap-3 border-b-[1.5px] p-3 px-4">
            <b>{t('botName')}</b>
            <span className="text-small text-ink-muted">{t('botNote')}</span>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            {state.kind === 'loading' ? (
              <p role="status" className="text-ink-muted text-small">
                {t('loading')}
              </p>
            ) : null}
            {state.kind === 'error' ? (
              <DataState
                variant="error"
                title={t('loadErrorTitle')}
                text={t('loadErrorText')}
                action={
                  <Button variant="secondary" size="sm" onClick={retry}>
                    {t('retry')}
                  </Button>
                }
              />
            ) : null}
            {state.kind === 'ready' && log.length === 0 ? (
              <DataState title={t('emptyTitle')} text={t('emptyText')} />
            ) : null}
            {log.map((m, i) => (
              <ChatMessage key={i} from={m.from} time={m.time} intent={m.intent}>
                {m.text}
                {m.results?.map((r) => (
                  <Link
                    key={`${r.type}-${r.id}`}
                    to={resultHref(r)}
                    className="text-brand mt-1.5 block text-[13px] underline"
                  >
                    {t(`resultLink.${r.type}`, { title: r.title })}
                  </Link>
                ))}
              </ChatMessage>
            ))}
            {sending ? (
              <p role="status" className="text-ink-muted text-small">
                {t('sending')}
              </p>
            ) : null}
          </div>

          <div className="border-line-strong flex flex-col gap-2 border-t-[1.5px] p-3 px-4">
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Chip
                  key={s}
                  disabled={sending}
                  className={sending ? 'pointer-events-none opacity-60' : undefined}
                  onClick={() => void send(t(`suggest.${s}`))}
                >
                  {t(`suggest.${s}`)}
                </Chip>
              ))}
            </div>
            <form onSubmit={onSend} className="flex items-center gap-2">
              <label htmlFor="q" className="sr-only">
                {t('message')}
              </label>
              <input
                id="q"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('placeholder')}
                disabled={sending}
                className="border-line-strong bg-surface-raised text-body focus-visible:border-focus focus-visible:outline-focus min-h-11 flex-1 rounded-sm border-[1.5px] px-3 focus-visible:outline-2 focus-visible:outline-offset-1"
              />
              <Button type="submit" disabled={sending || !draft.trim()}>
                {t('send')}
              </Button>
            </form>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2 p-6">
            <h2 className="text-h3">{t('canAnswer.title')}</h2>
            <ul className="text-small m-0 flex list-disc flex-col gap-1.5 pl-4.5">
              {CAN_ANSWER.map((item) => (
                <li key={item}>{t(`canAnswer.${item}`)}</li>
              ))}
            </ul>
          </Card>
          <Card className="flex flex-col gap-2 p-6">
            <h2 className="text-h3">{t('how.title')}</h2>
            <p className="text-small">{t('how.text')}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default CustomerAssistantPage;
