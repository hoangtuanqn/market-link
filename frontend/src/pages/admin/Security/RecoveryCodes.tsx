import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import Notification from '@/utils/notification';

const FILE_NAME = 'marketlink-recovery-codes.txt';

/** FR-008 — the list of just-generated recovery codes: shown only once, with copy / download buttons. */
const RecoveryCodes = ({ codes }: { codes: string[] }) => {
  const { t } = useTranslation('AdminSecurity');
  const text = codes.join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      Notification.success({ text: t('codes.copied') });
    } catch {
      Notification.error({ text: t('codes.copyFailed') });
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([`${t('codes.fileHeading')}\n\n${text}\n`], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = FILE_NAME;
    link.click();
    URL.revokeObjectURL(url);
    Notification.success({ text: t('codes.downloaded', { file: FILE_NAME }) });
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="bg-surface-sunken border-line-strong m-0 grid list-none grid-cols-1 gap-x-4 gap-y-2 rounded-sm border-[1.5px] p-4 font-mono text-[15px] md:grid-cols-2">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={copy}>
          {t('codes.copy')}
        </Button>
        <Button variant="secondary" size="sm" onClick={download}>
          {t('codes.download')}
        </Button>
      </div>
    </div>
  );
};

export default RecoveryCodes;
