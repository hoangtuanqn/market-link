import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import BlockedNotice from '@/utils/blockedNotice';

const SUPPORT_EMAIL = 'admin@marketlink.vn';

const StallSuspendedDialog = () => {
  const { t } = useTranslation();
  const [notice] = useState(() => BlockedNotice.peek());
  const [dismissed, setDismissed] = useState(false);
  const reason = notice?.kind === 'stall' ? notice.message : null;

  useEffect(() => BlockedNotice.clear(), []);

  if (reason === null || dismissed) return null;

  return (
    <Dialog
      open
      tone="danger"
      title={t('stallSuspended.title')}
      onClose={() => setDismissed(true)}
      actions={<Button onClick={() => setDismissed(true)}>{t('stallSuspended.acknowledge')}</Button>}
    >
      <div className="flex flex-col gap-3">
        <p className="text-body text-ink">{reason || t('stallSuspended.generic')}</p>
        <p className="text-small text-ink-muted">{t('stallSuspended.whatNow')}</p>
        <p className="text-small text-ink-muted">
          {t('stallSuspended.contactIntro')}{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    </Dialog>
  );
};

export default StallSuspendedDialog;
