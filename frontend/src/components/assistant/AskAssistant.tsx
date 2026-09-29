import { useTranslation } from 'react-i18next';
import { ChatIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useAssistant, useAssistantRecord, type AssistantRecord } from './assistantContext';

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
