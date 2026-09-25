import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import ChatMessage, { MessageOrderRef } from '@/components/ChatMessage';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { dayName, formatClock, formatDayMonth, vnd } from '@/lib/format';
import Helper from '@/utils/helper';
import TierBadge from '@/components/TierBadge';
import { demoTierOf } from '@/data/tiers';

/** A time is a 24-hour clock ("09:33"), a day and month ("22/09"), or one of the words below. */
type When = string;
const WORDS = ['yesterday', 'now'] as const;
const YEAR = 2026;

type LogEntry = { from: 'user' | 'bot'; time: When; content: ReactNode; suggestions?: string[] };

type Thread = {
  id: number;
  who: string;
  mono: string;
  last: string;
  time: When;
  unread?: boolean;
  orderHref?: string;
  orderCode?: string;
  /** What the stall knows about this customer: their orders with you, and the masked phone. */
  orders: number;
  collected?: number;
  phone: string;
};

const THREADS: Thread[] = [
  {
    id: 1,
    who: 'Nguyễn Minh Khang',
    mono: 'K',
    last: 'Could you hold 5 bunches instead of 2 on this order?',
    time: '09:33',
    unread: true,
    orderHref: '/farmer/orders/ML-0421',
    orderCode: '#ML-0421',
    orders: 2,
    collected: 1,
    phone: '0903 ••• 218',
  },
  {
    id: 2,
    who: 'Phạm Minh Anh',
    mono: 'A',
    last: 'Thank you, see you Saturday.',
    time: 'yesterday',
    orders: 1,
    phone: '0903 ••• 218',
  },
  {
    id: 3,
    who: 'Lê Lan Hương',
    mono: 'H',
    last: 'Is the choy sum coming back next week?',
    time: '22/09',
    orders: 1,
    phone: '0987 ••• 031',
  },
];

/** The order card attached to a message, written by MarketLink (not by either side), so it follows the language. */
const OrderRef = () => {
  const { t } = useTranslation('FarmerMessages');
  return (
    <MessageOrderRef
      href="/farmer/orders/ML-0421"
      title={t('orderRef.title', { code: '#ML-0421', name: 'Minh Khang' })}
      detail={t('orderRef.detail', {
        day: dayName(6),
        date: formatDayMonth(new Date(YEAR, 8, 26)),
        slot: `${formatClock('07:00')}–${formatClock('07:30')}`,
        items: t('items', { count: 3 }),
        total: vnd(56000),
        cutoff: formatClock('19:00'),
        cutoffDate: formatDayMonth(new Date(YEAR, 8, 25)),
      })}
    />
  );
};

const INITIAL_LOGS: Record<number, LogEntry[]> = {
  1: [
    { from: 'bot', time: '09:12', content: 'Morning. Is the water spinach still cut on Friday this week?' },
    {
      from: 'user',
      time: '09:20',
      content: 'Yes, Friday evening as always. I should bring about 20 bunches on Saturday.',
    },
    {
      from: 'bot',
      time: '09:33',
      content: (
        <>
          Could you hold 5 bunches instead of 2 on this order?
          <OrderRef />
        </>
      ),
      suggestions: ['Yes, I will hold five', 'Sorry, only three left', 'Come at 07:30 instead'],
    },
  ],
  2: [{ from: 'bot', time: 'yesterday', content: 'Thank you, see you Saturday.' }],
  3: [{ from: 'bot', time: '22/09', content: 'Is the choy sum coming back next week?' }],
};

/** Not in the SRS — a proposal the team can weigh, same as the Customer side (see the banner text below). */
const FarmerMessagesPage = () => {
  const { t } = useTranslation('FarmerMessages');
  const [activeId, setActiveId] = useState(1);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [draft, setDraft] = useState('');

  const active = THREADS.find((th) => th.id === activeId)!;
  const when = (time: When) => {
    const word = WORDS.find((w) => w === time);
    if (word) return t(`time.${word}`);
    const dm = /^(\d{1,2})\/(\d{1,2})$/.exec(time);
    return dm ? formatDayMonth(new Date(YEAR, Number(dm[2]) - 1, Number(dm[1]))) : formatClock(time);
  };
  const note = (th: Thread) => {
    const orders = t('note.orders', { count: th.orders });
    const history = th.collected ? t('note.withCollected', { orders, collected: th.collected }) : orders;
    return `${history} · ${th.phone}`;
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
        <p className="text-body max-w-160">{t('intro')}</p>
      </div>

      <Banner variant="warning" title={t('srs.title')}>
        {t('srs.text')}
      </Banner>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="border-line-strong flex items-center justify-between gap-3 border-b-[1.5px] p-3 px-4">
            <b>{t('conversations')}</b>
            <span className="text-small text-ink-muted">
              {t('unanswered', { count: THREADS.filter((th) => th.unread).length })}
            </span>
          </div>
          <ul className="m-0 flex max-h-160 flex-col overflow-y-auto p-0">
            {THREADS.map((th) => (
              <li key={th.id}>
                <button
                  type="button"
                  aria-current={th.id === activeId}
                  onClick={() => setActiveId(th.id)}
                  className={Helper.cn(
                    'border-line hover:bg-surface-quiet grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 border-t p-3 px-4 text-left first:border-t-0',
                    th.id === activeId && 'bg-brand-tint',
                  )}
                >
                  {/* Viền theo hạng của khách: sạp thấy hạng, không thấy số liệu */}
                  <span
                    aria-hidden="true"
                    data-tier={demoTierOf(th.who)}
                    className={Helper.cn(demoTierOf(th.who) && 'ml-tier-ring')}
                  >
                    <span className="bg-brand text-on-brand font-hand grid size-11 place-items-center rounded-full text-[22px]">
                      {th.mono}
                    </span>
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
          <div className="border-line-strong flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] p-3 px-4">
            <div>
              <span className="flex flex-wrap items-center gap-2">
                <b>{active.who}</b>
                {demoTierOf(active.who) && <TierBadge tier={demoTierOf(active.who)!} />}
              </span>
              <p className="text-small text-ink-muted mt-0.5">{note(active)}</p>
            </div>
            {active.orderHref && (
              <ButtonLink to={active.orderHref} variant="secondary" size="sm">
                {t('openOrder', { code: active.orderCode })}
              </ButtonLink>
            )}
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
              {t('replyTo', { name: active.who })}
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

      <Card className="flex flex-col gap-2 p-6">
        <h2 className="text-h3">{t('notOrder.title')}</h2>
        <p className="text-[15px]">{t('notOrder.text')}</p>
        <ButtonLink to="/farmer/orders" variant="ghost" className="self-start">
          {t('notOrder.link')}
        </ButtonLink>
      </Card>
    </div>
  );
};

export default FarmerMessagesPage;
