import { useTranslation } from 'react-i18next';
import { ChatIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useAssistant, useAssistantRecord, type AssistantRecord } from './assistantContext';

/**
 * FR-093, FR-094 — "ask the assistant about this" on a working screen.
 *
 * The button opens the panel with the question already typed; the person presses send. It also tells the assistant
 * which row this screen is on for as long as the screen is mounted, so follow-up questions like "and the one before
 * it?" still have something to hold on to.
 *
 * Renders nothing outside a panel that has an assistant, so a screen shared between panels can use it unconditionally.
 */
const AskAssistant = ({
  question,
  record,
  className,
}: {
  question: string;
  record?: AssistantRecord;
  className?: string;
}) => {
  const { t } = useTranslation('common');
  const assistant = useAssistant();
  useAssistantRecord(record ?? null);

  if (!assistant) return null;

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={className}
      onClick={() => assistant.openWith(question)}
    >
      <ChatIcon />
      {t('assistant.askAboutThis')}
    </Button>
  );
};

export default AskAssistant;
