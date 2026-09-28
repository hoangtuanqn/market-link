import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import AccountDeactivatedNotice from '@/utils/accountDeactivatedNotice';

const SUPPORT_EMAIL = 'admin@marketlink.vn';

/**
 * FR-072: an admin can deactivate an account while its owner is in the middle of browsing. `watchForAccountDeactivated`
 * (axiosInstance.ts) signs them out and reloads to Home — landing there with no explanation is bewildering, so this
 * says plainly what happened, why, and what they can still do. A dialog rather than a toast: being locked out is not a
 * passing notice.
 */
const AccountDeactivatedDialog = () => {
  const { t } = useTranslation();
  // Read once during the first render (pure, so a double-invoked initializer is harmless)…
  const [reason] = useState<string | null>(() => AccountDeactivatedNotice.peek());
  const [dismissed, setDismissed] = useState(false);

  // …and remove it after mounting, so a later reload does not show it again.
  useEffect(() => AccountDeactivatedNotice.clear(), []);

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
