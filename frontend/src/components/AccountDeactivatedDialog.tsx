import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import BlockedNotice from '@/utils/blockedNotice';

const SUPPORT_EMAIL = 'admin@marketlink.vn';

const AccountDeactivatedDialog = () => {
  const { t } = useTranslation();
  const [notice] = useState(() => BlockedNotice.peek());
  const [dismissed, setDismissed] = useState(false);
  const reason = notice?.kind === 'account' ? notice.message : null;

  useEffect(() => BlockedNotice.clear(), []);

  if (reason === null || dismissed) return null;

  return (
    <Dialog
      open
      tone="danger"
      title={t('accountDeactivated.title')}
      onClose={() => setDismissed(true)}
      actions={<Button onClick={() => setDismissed(true)}>{t('accountDeactivated.acknowledge')}</Button>}
    >
      <div className="flex flex-col gap-3">
        <p className="text-body text-ink">{reason || t('accountDeactivated.generic')}</p>
        <p className="text-small text-ink-muted">{t('accountDeactivated.whatNow')}</p>
        <p className="text-small text-ink-muted">
          {t('accountDeactivated.contactIntro')}{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    </Dialog>
  );
};

export default AccountDeactivatedDialog;
