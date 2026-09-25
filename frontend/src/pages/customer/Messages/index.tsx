import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import ChatMessage, { MessageOrderRef } from '@/components/ChatMessage';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Helper from '@/utils/helper';

type LogEntry = { from: 'user' | 'bot'; time: string; content: ReactNode; suggestions?: string[] };

type Thread = {
  id: number;
  who: string;
  farmerId: number;
  mono: string;
  last: string;
  time: string;
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
    time: 'Yesterday',
    unread: true,
    stallLine: 'Thảo Điền Weekend Market · stall A04',
    orderCode: '#ML-0409',
    orderHref: '/orders/ML-0409',
  },
];

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
          <MessageOrderRef
            href="/orders/ML-0421"
            title="Order #ML-0421 · Cô Tư Garden"
            detail="Sat 26/09 · 07:00–07:30 · 3 items · 56,000 ₫ · closes 19:00 on 25/09"
            onDark
          />
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
  2: [{ from: 'bot', time: 'Yesterday', content: 'Your rye loaf is out of the oven, come any time after 07:30.' }],
};

/** Not in the SRS — a proposal the team can weigh, kept behind a warning banner (see the banner text below). */
const CustomerMessagesPage = () => {
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
        <p className="text-body-lg">
          Ask a stall about this week&apos;s produce, or settle the details of an order before the cutoff.
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
            <span className="text-small text-ink-muted">{THREADS.length} stalls</span>
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
          <div className="border-line-strong flex items-center justify-between gap-3 border-b-[1.5px] p-3 px-4">
            <div>
              <b>{active.who}</b>
              <p className="text-small text-ink-muted mt-0.5">
                {active.stallLine} ·{' '}
                <Link to={`/stalls/${active.farmerId}`} className="text-brand underline">
                  See the stall
                </Link>
              </p>
            </div>
            <ButtonLink to={active.orderHref} variant="secondary" size="sm">
              Open order {active.orderCode}
            </ButtonLink>
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
              Message to {active.who}
            </label>
            <input
              id="q"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about this week's stock or your pickup time"
              className="border-line-strong bg-surface-raised text-body focus-visible:border-focus focus-visible:outline-focus min-h-11 flex-1 rounded-sm border-[1.5px] px-3 focus-visible:outline-2 focus-visible:outline-offset-1"
            />
            <Button type="submit">Send</Button>
          </form>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="text-h3">What messages are for</h2>
          <p className="text-[15px]">
            Checking that something is still coming, asking the stall to hold a little more, or agreeing a different
            pickup time. Changes to an order still go through the order itself, so both sides have the same record.
          </p>
          <Link to="/orders/ML-0421/edit" className="text-brand underline">
            Edit order #ML-0421
          </Link>
        </Card>
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="text-h3">What they are not for</h2>
          <p className="text-[15px]">
            There is no price negotiation and no payment here. Prices are set by the stall and you pay at the stall when
            you collect. A message never changes an order on its own.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default CustomerMessagesPage;
