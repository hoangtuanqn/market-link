import { useTranslation } from 'react-i18next';
import MessagesLayout from '@/components/chat/MessagesLayout';

/** FR-110…115: a Customer's messages with stalls, real data and realtime. */
export default function CustomerMessagesPage() {
  const { t } = useTranslation('CustomerMessages');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg">{t('intro')}</p>
      </div>
      <MessagesLayout />
    </div>
  );
}
