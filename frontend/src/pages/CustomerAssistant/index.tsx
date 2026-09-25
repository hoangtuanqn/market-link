import { useState, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import ChatMessage from '@/components/ChatMessage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { dayName, formatClock, formatDayMonth, perUnit } from '@/lib/format';

type Suggestion =
  'pomeloSat' | 'baChieuOpen' | 'showMap' | 'slotsUtHien' | 'addPomelos' | 'directionsThuDuc' | 'thaoDien';
type Reply = 'greeting' | 'pomelo' | 'slots' | 'unknown';

/** What a message says: a prepared reply (translated when shown), a suggestion the user tapped, or typed text. */
type Say = { reply: Reply } | { suggestion: Suggestion } | { question: 'pomeloMorning' } | { text: string };

type LogEntry = { from: 'user' | 'bot'; time: string; intent?: string; say: Say; suggestions?: Suggestion[] };

const SAT = new Date(2026, 8, 26);
const SUN = new Date(2026, 8, 27);

const INITIAL_LOG: LogEntry[] = [
  { from: 'bot', time: '20:13', say: { reply: 'greeting' }, suggestions: ['pomeloSat', 'baChieuOpen'] },
  { from: 'user', time: '20:14', say: { question: 'pomeloMorning' } },
  {
    from: 'bot',
    time: '20:14',
    intent: 'find product',
    say: { reply: 'pomelo' },
    suggestions: ['showMap', 'slotsUtHien'],
  },
  { from: 'user', time: '20:15', say: { suggestion: 'slotsUtHien' } },
  {
    from: 'bot',
    time: '20:15',
    intent: 'pickup slots',
    say: { reply: 'slots' },
    suggestions: ['addPomelos', 'directionsThuDuc'],
  },
];

const CAN_ANSWER = ['product', 'hours', 'stalls', 'slots', 'price'] as const;

/** FR-090 FR-091 FR-092, Optional (SHOULD) — intent → prepared query with parameters, never LLM-generated SQL (R-04). */
const CustomerAssistantPage = () => {
  const { t } = useTranslation('CustomerAssistant');
  const [log, setLog] = useState(INITIAL_LOG);
  const [draft, setDraft] = useState('');

  const ask = (text: string) => {
    const value = text.trim();
    if (!value) return;
    setLog((prev) => [
      ...prev,
      { from: 'user', time: '20:16', say: { text: value } },
      { from: 'bot', time: '20:16', intent: 'unknown', say: { reply: 'unknown' }, suggestions: ['thaoDien'] },
    ]);
  };

  const reply = (r: Reply) => {
    switch (r) {
      case 'greeting':
        return t('reply.greeting', { name: 'Khang' });
      case 'pomelo':
        return (
          <Trans
            t={t}
            i18nKey="reply.pomelo"
            values={{
              day: dayName(6, 'long'),
              date: formatDayMonth(SAT),
              price1: perUnit(65000, 'piece'),
              price2: perUnit(60000, 'piece'),
            }}
            components={{ b: <b /> }}
          />
        );
      case 'slots':
        return t('reply.slots', {
          from: formatClock('06:00'),
          to: formatClock('09:30'),
          day: dayName(0, 'long'),
          date: formatDayMonth(SUN),
          free: ['06:30', '07:00', '08:00'].map(formatClock).join(', '),
          full: formatClock('06:00'),
        });
      default:
        return t('reply.unknown');
    }
  };

  const content = (say: Say) => {
    if ('reply' in say) return reply(say.reply);
    if ('suggestion' in say) return t(`suggest.${say.suggestion}`);
    if ('question' in say) return t(`question.${say.question}`);
    return say.text;
  };

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    ask(draft);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-hand text-hand text-ink-muted">{t('eyebrow')}</p>
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
            {log.map((m, i) => (
              <ChatMessage
                key={i}
                from={m.from}
                time={formatClock(m.time)}
                intent={m.intent}
                suggestions={m.suggestions?.map((x) => t(`suggest.${x}`))}
                onSuggestion={ask}
              >
                {content(m.say)}
              </ChatMessage>
            ))}
          </div>

          <form onSubmit={onSend} className="border-line-strong flex items-center gap-2 border-t-[1.5px] p-3 px-4">
            <label htmlFor="q" className="sr-only">
              {t('message')}
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
