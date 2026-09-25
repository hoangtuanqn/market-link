import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import ChatMessage, { MessageOrderRef } from '@/components/ChatMessage';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { dayName, formatClock, formatDayMonth, vnd } from '@/lib/format';
import Helper from '@/utils/helper';

/** A time is a 24-hour clock ("09:41"), or one of the words below. */
type When = string;
const WORDS = ['yesterday', 'now'] as const;

type LogEntry = { from: 'user' | 'bot'; time: When; content: ReactNode; suggestions?: string[] };

type Thread = {
  id: number;
  who: string;
  farmerId: number;
  mono: string;
  last: string;
  time: When;
  unread?: boolean;
  stallLine: string;
  orderCode: string;
  orderHref: string;
};

const THREADS: Thread[] = [
  {
    id: 1,
    who: 'Cô Tư Garden',
    farmerId: 1,
    mono: 'C',
    last: 'Five is fine. Edit the order and I will accept it again.',
    time: '09:41',
    stallLine: 'Thảo Điền Weekend Market · stall A12',
    orderCode: '#ML-0421',
    orderHref: '/orders/ML-0421',
  },
  {
    id: 2,
    who: 'Gió Nam Bakery',
    farmerId: 4,
    mono: 'G',
    last: 'Your rye loaf is out of the oven, come any time after 07:30.',
    time: 'yesterday',
    unread: true,
    stallLine: 'Thảo Điền Weekend Market · stall A04',
    orderCode: '#ML-0409',
    orderHref: '/orders/ML-0409',
  },
];

/** The order card attached to a message, written by MarketLink (not by either side), so it follows the language. */
const OrderRef = () => {
  const { t } = useTranslation('CustomerMessages');
  return (
    <MessageOrderRef
      href="/orders/ML-0421"
      title={t('orderRef.title', { code: '#ML-0421', stall: 'Cô Tư Garden' })}
      detail={t('orderRef.detail', {
        day: dayName(6),
        date: formatDayMonth(new Date(2026, 8, 26)),
        slot: `${formatClock('07:00')}–${formatClock('07:30')}`,
        items: t('items', { count: 3 }),
        total: vnd(56000),
        cutoff: formatClock('19:00'),
        cutoffDate: formatDayMonth(new Date(2026, 8, 25)),
      })}
      onDark
    />
  );
};

const INITIAL_LOGS: Record<number, LogEntry[]> = {
  1: [
    { from: 'user', time: '09:12', content: 'Morning. Is the water spinach still cut on Friday this week?' },
    {
      from: 'bot',
      time: '09:20',
      content: 'Yes, Friday evening as always. I should bring about 20 bunches on Saturday.',
    },
    {
      from: 'user',
      time: '09:33',
      content: (
        <>
          Could you hold 5 bunches instead of 2 on this order?
          <OrderRef />
        </>
      ),
    },
    {
      from: 'bot',
      time: '09:41',
      content: 'Five is fine. Edit the order and I will accept it again, then the count is right on my side too.',
      suggestions: ['Edit the order now', 'Can I collect at 09:00 instead?', 'Thank you'],
    },
  ],
  2: [{ from: 'bot', time: 'yesterday', content: 'Your rye loaf is out of the oven, come any time after 07:30.' }],
};

/** Not in the SRS — a proposal the team can weigh, kept behind a warning banner (see the banner text below). */
const CustomerMessagesPage = () => {
  const { t } = useTranslation('CustomerMessages');
  const [activeId, setActiveId] = useState(1);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [draft, setDraft] = useState('');

  const active = THREADS.find((th) => th.id === activeId)!;
  const when = (time: When) => {
    const word = WORDS.find((w) => w === time);
    return word ? t(`time.${word}`) : formatClock(time);
  };
  const log = logs[activeId] ?? [];

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    if (!value) return;
    setLogs((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), { from: 'user', time: 'now', content: value }],
    }));
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg">{t('intro')}</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="border-line-strong flex items-center justify-between gap-3 border-b-[1.5px] p-3 px-4">
            <b>{t('conversations')}</b>
            <span className="text-small text-ink-muted">{t('stallCount', { count: THREADS.length })}</span>
          </div>
          <ul className="m-0 flex max-h-160 flex-col overflow-y-auto p-0">
            {THREADS.map((th) => (
              <li key={th.id}>
                <button
                  type="button"
                  aria-current={th.id === activeId}
                  onClick={() => setActiveId(th.id)}
                  className={Helper.cn(
                    'border-line hover:bg-surface-quiet grid w-full grid-cols-[44px_1fr_auto] items-start gap-3 border-t p-3 px-4 text-left first:border-t-0',
                    th.id === activeId && 'bg-brand-tint',
                  )}
                >
                  <span
                    className="bg-brand text-on-brand font-hand grid size-11 place-items-center rounded-full text-[22px]"
                    aria-hidden="true"
                  >
                    {th.mono}
                  </span>
                  <span>
                    <b className="block text-[15px]">
                      {th.who}
                      {th.unread && (
                        <span
                          aria-hidden="true"
                          className="bg-brand ml-1.5 inline-block size-2 rounded-full align-middle"
                        />
                      )}
                    </b>
                    <small className="text-ink-muted block max-w-60 truncate text-[13px]">{th.last}</small>
                  </span>
                  <time className="text-ink-muted text-[12px] whitespace-nowrap">{when(th.time)}</time>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <section
          aria-label={t('conversationWith', { name: active.who })}
          className="border-line-strong bg-surface-raised shadow-tag grid h-160 grid-rows-[auto_1fr_auto] rounded-md border-[1.5px]"
        >
          <div className="border-line-strong flex items-center justify-between gap-3 border-b-[1.5px] p-3 px-4">
            <div>
              <b>{active.who}</b>
              <p className="text-small text-ink-muted mt-0.5">
                {active.stallLine} ·{' '}
                <Link to={`/stalls/${active.farmerId}`} className="text-brand underline">
                  {t('seeStall')}
                </Link>
              </p>
            </div>
            <ButtonLink to={active.orderHref} variant="secondary" size="sm">
              {t('openOrder', { code: active.orderCode })}
            </ButtonLink>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            {log.map((m, i) => (
              <ChatMessage
                key={i}
                from={m.from}
                who={m.from === 'user' ? t('you') : active.who}
                time={when(m.time)}
                suggestions={m.suggestions}
              >
                {m.content}
              </ChatMessage>
            ))}
          </div>

          <form onSubmit={onSend} className="border-line-strong flex items-center gap-2 border-t-[1.5px] p-3 px-4">
            <label htmlFor="q" className="sr-only">
              {t('messageTo', { name: active.who })}
            </label>
            <input
              id="q"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('placeholder')}
              className="border-line-strong bg-surface-raised text-body focus-visible:border-focus focus-visible:outline-focus min-h-11 flex-1 rounded-sm border-[1.5px] px-3 focus-visible:outline-2 focus-visible:outline-offset-1"
            />
            <Button type="submit">{t('send')}</Button>
          </form>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="text-h3">{t('for.title')}</h2>
          <p className="text-[15px]">{t('for.text')}</p>
          <Link to="/orders/ML-0421/edit" className="text-brand underline">
            {t('for.edit', { code: '#ML-0421' })}
          </Link>
        </Card>
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="text-h3">{t('notFor.title')}</h2>
          <p className="text-[15px]">{t('notFor.text')}</p>
        </Card>
      </div>
    </div>
  );
};

export default CustomerMessagesPage;
