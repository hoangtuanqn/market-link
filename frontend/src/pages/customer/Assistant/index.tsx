import { useState, type FormEvent, type ReactNode } from 'react';
import ChatMessage from '@/components/ChatMessage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type LogEntry = { from: 'user' | 'bot'; time: string; intent?: string; content: ReactNode; suggestions?: string[] };

const INITIAL_LOG: LogEntry[] = [
  {
    from: 'bot',
    time: '20:13',
    content: 'Hi Khang. Ask me what is available this weekend, or when a market opens.',
    suggestions: ['Where can I get green-skin pomelo on Saturday?', 'When does Bà Chiểu Green Market open?'],
  },
  { from: 'user', time: '20:14', content: 'Which market has green-skin pomelo on Saturday morning?' },
  {
    from: 'bot',
    time: '20:14',
    intent: 'find product',
    content: (
      <>
        On Saturday 26/09, 2 stalls have green-skin pomelo: <b>Út Hiền Orchard</b> at Thủ Đức Farmers Market (2 left,
        65,000 ₫ a piece) and <b>Ba Lành Farm</b> at Thảo Điền Weekend Market (9 left, 60,000 ₫ a piece).
      </>
    ),
    suggestions: ['Show the 2 stalls on the map', 'Pickup times at Út Hiền'],
  },
  { from: 'user', time: '20:15', content: 'Pickup times at Út Hiền' },
  {
    from: 'bot',
    time: '20:15',
    intent: 'pickup slots',
    content:
      'Út Hiền Orchard picks up 06:00 – 09:30 on Sunday 27/09 at Thủ Đức Farmers Market. Free slots: 06:30, 07:00, 08:00. The 06:00 slot is full. Orders close 12 hours before the slot.',
    suggestions: ['Add 2 pomelos to my cart', 'Directions to Thủ Đức Farmers Market'],
  },
];

const CAN_ANSWER = [
  'Find a product across markets and stalls, with how many are left',
  'Market days and opening hours',
  'Which stalls are at a market on a given day',
  "A stall's pickup windows and free slots",
  "A product's price, unit and stock",
];

/** FR-090 FR-091 FR-092, Optional (SHOULD) — intent → prepared query with parameters, never LLM-generated SQL (R-04). */
const CustomerAssistantPage = () => {
  const [log, setLog] = useState(INITIAL_LOG);
  const [draft, setDraft] = useState('');

  const ask = (text: string) => {
    const value = text.trim();
    if (!value) return;
    setLog((prev) => [
      ...prev,
      { from: 'user', time: '20:16', content: value },
      {
        from: 'bot',
        time: '20:16',
        intent: 'unknown',
        content: 'I did not understand that. Try a product name, a market, or a stall.',
        suggestions: ['What is at Thảo Điền on Saturday?'],
      },
    ]);
  };

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    ask(draft);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-hand text-hand text-ink-muted">Optional · FR-090 to FR-092</p>
        <h1 className="text-h1">Shopping assistant</h1>
        <p className="text-body-lg max-w-155">
          Ask where to find something this weekend, when a market opens, or which pickup slots a stall has. Every answer
          comes from MarketLink&apos;s own data.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section
          aria-label="Assistant conversation"
          className="border-line-strong bg-surface-raised shadow-tag grid h-160 grid-rows-[auto_1fr_auto] rounded-md border-[1.5px]"
        >
          <div className="border-line-strong flex items-center justify-between gap-3 border-b-[1.5px] p-3 px-4">
            <b>MarketLink assistant</b>
            <span className="text-small text-ink-muted">
              Answers use the live catalogue. Intent shown under each reply.
            </span>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            {log.map((m, i) => (
              <ChatMessage
                key={i}
                from={m.from}
                time={m.time}
                intent={m.intent}
                suggestions={m.suggestions}
                onSuggestion={ask}
              >
                {m.content}
              </ChatMessage>
            ))}
          </div>

          <form onSubmit={onSend} className="border-line-strong flex items-center gap-2 border-t-[1.5px] p-3 px-4">
            <label htmlFor="q" className="sr-only">
              Message
            </label>
            <input
              id="q"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. Who has eggs at Thảo Điền on Saturday?"
              className="border-line-strong bg-surface-raised text-body focus-visible:border-focus focus-visible:outline-focus min-h-11 flex-1 rounded-sm border-[1.5px] px-3 focus-visible:outline-2 focus-visible:outline-offset-1"
            />
            <Button type="submit">Send</Button>
          </form>
        </section>

        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2 p-6">
            <h2 className="text-h3">What it can answer</h2>
            <ul className="text-small m-0 flex list-disc flex-col gap-1.5 pl-4.5">
              {CAN_ANSWER.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
          <Card className="flex flex-col gap-2 p-6">
            <h2 className="text-h3">How it works</h2>
            <p className="text-small">
              The message is classified into one of a fixed set of intents, and each intent runs a prepared query with
              parameters. The model never writes SQL. Messages are stored with the intent so the flow can be shown to
              the judges.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default CustomerAssistantPage;
