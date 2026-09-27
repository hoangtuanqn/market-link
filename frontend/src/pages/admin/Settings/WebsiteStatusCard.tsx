import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PlatformApi from '@/api-requests/platform.requests';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import PlatformStatus from '@/lib/platformStatus';
import Notification from '@/utils/notification';

type Status = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; maintenanceMode: boolean };

/**
 * FR-008-adjacent — site-wide maintenance mode (prototype admin/settings.html). Turning it ON locks out every visitor
 * but admins right away (MaintenanceModeFilter), so that direction asks for a confirm dialog; turning it back OFF does
 * not.
 */
const WebsiteStatusCard = () => {
  const { t } = useTranslation('AdminSettings');
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchStatus = useCallback(() => {
    PlatformApi.status()
      .then((res) => setStatus({ kind: 'ready', maintenanceMode: res.data.maintenanceMode }))
      .catch(() => setStatus({ kind: 'error' }));
  }, []);

  useEffect(fetchStatus, [fetchStatus]);

  const load = () => {
    setStatus({ kind: 'loading' });
    fetchStatus();
  };

  const apply = async (maintenanceMode: boolean) => {
    setBusy(true);
    try {
      const res = await PlatformApi.setMaintenanceMode(maintenanceMode);
      setStatus({ kind: 'ready', maintenanceMode: res.data.maintenanceMode });
      PlatformStatus.set(res.data.maintenanceMode);
      Notification.success({ text: maintenanceMode ? t('website.toastOn') : t('website.toastOff') });
      setConfirmOpen(false);
    } catch {
      Notification.error({ text: t('website.error') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card as="section" aria-labelledby="set-website" className="flex flex-col gap-4 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex max-w-2xl flex-col gap-1">
          <h2 id="set-website" className="text-h3 text-ink font-bold">
            {t('website.title')}
          </h2>
          <p className="text-small text-ink-muted">
            {status.kind === 'ready' && status.maintenanceMode ? t('website.maintenanceText') : t('website.intro')}
          </p>
        </div>

        {status.kind === 'loading' && (
          <div aria-busy="true" className="shrink-0 sm:self-center">
            <span className="sr-only">{t('website.loading')}</span>
            <div className="bg-surface-sunken h-11 w-48 animate-pulse rounded-sm" />
          </div>
        )}

        {status.kind === 'ready' && (
          <div className="shrink-0 sm:self-center">
            {status.maintenanceMode ? (
              <Button variant="success" onClick={() => void apply(false)} disabled={busy}>
                {t('website.disable')}
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setConfirmOpen(true)} disabled={busy}>
                {t('website.enable')}
              </Button>
            )}
          </div>
        )}
      </div>

      {status.kind === 'error' && (
        <DataState
          variant="error"
          title={t('website.loadErrorTitle')}
          text={t('website.loadErrorText')}
          action={
            <Button variant="secondary" size="sm" onClick={load}>
              {t('website.retry')}
            </Button>
          }
        />
      )}

      <Dialog
        open={confirmOpen}
        tone="danger"
        title={t('website.confirmTitle')}
        onClose={() => setConfirmOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={busy}>
              {t('website.cancelButton')}
            </Button>
            <Button variant="danger" onClick={() => void apply(true)} disabled={busy}>
              {t('website.confirmButton')}
            </Button>
          </>
        }
      >
        <p>{t('website.confirmText')}</p>
      </Dialog>
    </Card>
  );
};

export default WebsiteStatusCard;
