import { useTranslation } from 'react-i18next';
import MessagesLayout from '@/components/chat/MessagesLayout';

/** FR-110…115, spec §9.3: reuses the EXACT SAME conversation body as Customer, only the shell differs. */
export default function FarmerMessagesPage() {
  const { t } = useTranslation('FarmerMessages');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body max-w-160">{t('intro')}</p>
      </div>
      <MessagesLayout emptyText={t('noThreadsText')} />
    </div>
  );
}
