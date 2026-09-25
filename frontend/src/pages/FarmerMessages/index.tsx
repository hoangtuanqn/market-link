import { useState, type FormEvent, type ReactNode } from 'react';
import ChatMessage, { MessageOrderRef } from '@/components/ChatMessage';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Helper from '@/utils/helper';

type LogEntry = { from: 'user' | 'bot'; time: string; content: ReactNode; suggestions?: string[] };

type Thread = {
  id: number;
  who: string;
  mono: string;
  last: string;
  time: string;
  unread?: boolean;
  orderHref?: string;
  orderCode?: string;
  note: string;
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
    note: '2 orders with you, 1 collected · 0903 ••• 218',
  },
  {
    id: 2,
    who: 'Phạm Minh Anh',
    mono: 'A',
    last: 'Thank you, see you Saturday.',
    time: 'Yesterday',
    note: '1 order with you · 0903 ••• 218',
  },
  {
    id: 3,
    who: 'Lê Lan Hương',
    mono: 'H',
    last: 'Is the choy sum coming back next week?',
    time: '22/09',
    note: '1 order with you · 0987 ••• 031',
  },
];

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
          <MessageOrderRef
            href="/farmer/orders/ML-0421"
            title="Order #ML-0421 · Minh Khang"
            detail="Sat 26/09 · 07:00–07:30 · 3 items · 56,000 ₫ · closes 19:00 on 25/09"
          />
        </>
      ),
      suggestions: ['Yes, I will hold five', 'Sorry, only three left', 'Come at 07:30 instead'],
    },
  ],
  2: [{ from: 'bot', time: 'Yesterday', content: 'Thank you, see you Saturday.' }],
  3: [{ from: 'bot', time: '22/09', content: 'Is the choy sum coming back next week?' }],
};

/** Not in the SRS — a proposal the team can weigh, same as the Customer side (see the banner text below). */
const FarmerMessagesPage = () => {
  const [activeId, setActiveId] = useState(1);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [draft, setDraft] = useState('');

  const active = THREADS.find((t) => t.id === activeId)!;
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
        <h1 className="text-h1">Messages</h1>
        <p className="text-body max-w-160">
          Questions from customers about this week&apos;s stock and their pickup times. Answer before the cutoff so they
          can still change the order themselves.
        </p>
      </div>

      <Banner variant="warning" title="Messaging is not in the SRS.">
        Ask the LEAD for a new requirement before this is built. The screen exists so the team can judge whether it is
        worth the hours.
      </Banner>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="border-line-strong flex items-center justify-between gap-3 border-b-[1.5px] p-3 px-4">
            <b>Conversations</b>
            <span className="text-small text-ink-muted">{THREADS.filter((t) => t.unread).length} unanswered</span>
          </div>
          <ul className="m-0 flex max-h-160 flex-col overflow-y-auto p-0">
            {THREADS.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-current={t.id === activeId}
                  onClick={() => setActiveId(t.id)}
                  className={Helper.cn(
                    'border-line hover:bg-surface-quiet grid w-full grid-cols-[44px_1fr_auto] items-start gap-3 border-t p-3 px-4 text-left first:border-t-0',
                    t.id === activeId && 'bg-brand-tint',
                  )}
                >
                  <span
                    className="bg-brand text-on-brand font-hand grid size-11 place-items-center rounded-full text-[22px]"
                    aria-hidden="true"
                  >
                    {t.mono}
                  </span>
                  <span>
                    <b className="block text-[15px]">
                      {t.who}
                      {t.unread && (
                        <span
                          aria-hidden="true"
                          className="bg-brand ml-1.5 inline-block size-2 rounded-full align-middle"
                        />
                      )}
                    </b>
                    <small className="text-ink-muted block max-w-60 truncate text-[13px]">{t.last}</small>
                  </span>
                  <time className="text-ink-muted text-[12px] whitespace-nowrap">{t.time}</time>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <section
          aria-label={`Conversation with ${active.who}`}
          className="border-line-strong bg-surface-raised shadow-tag grid h-160 grid-rows-[auto_1fr_auto] rounded-md border-[1.5px]"
        >
          <div className="border-line-strong flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] p-3 px-4">
            <div>
              <b>{active.who}</b>
              <p className="text-small text-ink-muted mt-0.5">{active.note}</p>
            </div>
            {active.orderHref && (
              <ButtonLink to={active.orderHref} variant="secondary" size="sm">
                Open order {active.orderCode}
              </ButtonLink>
            )}
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            {log.map((m, i) => (
              <ChatMessage
                key={i}
                from={m.from}
                who={m.from === 'user' ? 'You' : active.who}
                time={m.time}
                suggestions={m.suggestions}
              >
                {m.content}
              </ChatMessage>
            ))}
          </div>

          <form onSubmit={onSend} className="border-line-strong flex items-center gap-2 border-t-[1.5px] p-3 px-4">
            <label htmlFor="q" className="sr-only">
              Reply to {active.who}
            </label>
            <input
              id="q"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Answer about stock or the pickup time"
              className="border-line-strong bg-surface-raised text-body focus-visible:border-focus focus-visible:outline-focus min-h-11 flex-1 rounded-sm border-[1.5px] px-3 focus-visible:outline-2 focus-visible:outline-offset-1"
            />
            <Button type="submit">Send</Button>
          </form>
        </section>
      </div>

      <Card className="flex flex-col gap-2 p-6">
        <h2 className="text-h3">A message does not change the order</h2>
        <p className="text-[15px]">
          Agreeing a change here is only half of it. The customer edits the order, it comes back to you as Placed, and
          you accept it again. That way the stock count and the pickup slot stay right.
        </p>
        <ButtonLink to="/farmer/orders" variant="ghost" className="self-start">
          Go to incoming orders
        </ButtonLink>
      </Card>
    </div>
  );
};

export default FarmerMessagesPage;
