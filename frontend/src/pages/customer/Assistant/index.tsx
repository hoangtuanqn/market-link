import { useTranslation } from 'react-i18next';
import AssistantChat from '@/components/assistant/AssistantChat';
import { Card } from '@/components/ui/card';

const CAN_ANSWER = ['product', 'price', 'hours', 'stalls', 'slots', 'guide'] as const;

/**
 * FR-090 FR-091 FR-092 — the assistant's full page. Claude picks read-only tools that run prepared queries (never
 * LLM-generated SQL, R-04) and answers how-to questions from the user guide; the conversation itself is AssistantChat,
 * shared with the floating launcher.
 */
const CustomerAssistantPage = () => {
  const { t } = useTranslation('CustomerAssistant');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg max-w-155">{t('intro')}</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section
          aria-label={t('conversation')}
          className="border-line-strong bg-surface-raised shadow-tag flex h-160 max-h-[calc(100dvh-160px)] min-h-110 flex-col overflow-hidden rounded-md border-[1.5px]"
        >
          <AssistantChat className="min-h-0 flex-1" />
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
