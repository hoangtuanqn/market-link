import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import MfaApi from '@/api-requests/mfa.requests';
import { CheckIcon, InfoIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/input';
import { ADMIN_SETUP_2FA_PATH } from '@/constants/nav';
import type { MfaStatusType } from '@/types/auth.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import { CODE_REGEX, codeError, codeInputClass } from './mfaCode';
import RecoveryCodes from './RecoveryCodes';

type Status = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: MfaStatusType };
type DialogKind = 'disable' | 'regen' | null;

const StatusPill = ({ on }: { on: boolean }) => {
  const { t } = useTranslation('AdminSecurity');
  return (
    <span
      className={Helper.cn(
        'inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold',
        on ? 'bg-status-ready-bg text-status-ready-ink' : 'bg-status-placed-bg text-status-placed-ink',
      )}
    >
      {on ? <CheckIcon size={14} /> : <InfoIcon size={14} />}
      {on ? t('pill.on') : t('pill.off')}
    </span>
  );
};

const AdminSecurityPage = () => {
  const { t } = useTranslation('AdminSecurity');
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [dialogCode, setDialogCode] = useState('');
  const [dialogError, setDialogError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const fetchStatus = useCallback(() => {
    MfaApi.status()
      .then((response) => setStatus({ kind: 'ready', data: response.data }))
      .catch(() => setStatus({ kind: 'error' }));
  }, []);

  useEffect(fetchStatus, [fetchStatus]);

  const load = () => {
    setStatus({ kind: 'loading' });
    fetchStatus();
  };

  const openDialog = (kind: DialogKind) => {
    setDialog(kind);
    setDialogCode('');
    setDialogError(undefined);
  };

  const submitDialog = async (e: FormEvent) => {
    e.preventDefault();
    if (!CODE_REGEX.test(dialogCode)) {
      setDialogError(t('error.sixDigits'));
      return;
    }
    setBusy(true);
    try {
      if (dialog === 'disable') {
        await MfaApi.disable(dialogCode);
        setNewCodes(null);
        Notification.success({ text: t('toast.off') });
      } else {
        const response = await MfaApi.regenerateRecoveryCodes(dialogCode);
        setNewCodes(response.data.codes);
        Notification.success({ text: t('toast.regenerated') });
      }
      setDialog(null);
      load();
    } catch (error) {
      setDialogError(codeError(error, t('error.check')));
      setDialogCode('');
    } finally {
      setBusy(false);
    }
  };

  const enabled = status.kind === 'ready' && status.data.enabled;

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-overline text-ink-muted uppercase">{t('overline')}</p>
        <h1 className="text-h1 text-ink font-bold">{t('title')}</h1>
      </div>

      {status.kind === 'loading' && (
        <Card aria-busy="true" className="flex flex-col gap-3 p-4 md:p-6">
          <span className="sr-only">{t('loading')}</span>
          <div className="bg-surface-sunken h-6 w-60 max-w-full rounded-sm" />
          <div className="bg-surface-sunken h-4 w-full rounded-sm" />
          <div className="bg-surface-sunken h-11 w-72 max-w-full rounded-sm" />
        </Card>
      )}

      {status.kind === 'error' && (
        <DataState
          variant="error"
          title={t('loadError.title')}
          text={t('loadError.text')}
          action={
            <Button variant="secondary" size="sm" onClick={load}>
              {t('loadError.retry')}
            </Button>
          }
        />
      )}

      {status.kind === 'ready' && (
        <Card aria-labelledby="mfa-title" className="flex flex-col gap-4 p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex max-w-155 flex-col gap-2">
              <h2 id="mfa-title" className="text-[20px] font-bold">
                {t('mfa.title')}
              </h2>
              <p className="text-small text-ink-muted">{t('mfa.intro')}</p>
            </div>
            <StatusPill on={enabled} />
          </div>

          {!enabled && (
            <div>
              <Button onClick={() => navigate(ADMIN_SETUP_2FA_PATH)}>{t('mfa.turnOn')}</Button>
            </div>
          )}

          {enabled && (
            <div className="flex flex-col gap-4">
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-ink-muted">{t('codesLeft.label')}</dt>
                <dd className="m-0">
                  <Trans
                    t={t}
                    i18nKey="codesLeft.value"
                    values={{ left: status.data.recoveryCodesLeft, total: 10 }}
                    components={{ b: <b /> }}
                  />
                </dd>
              </dl>
              {newCodes && <RecoveryCodes codes={newCodes} />}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => openDialog('regen')}>
                  {t('regen.open')}
                </Button>
                <Button variant="danger" size="sm" onClick={() => openDialog('disable')}>
                  {t('disable.open')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Dialog
        open={dialog !== null}
        tone={dialog === 'disable' ? 'danger' : undefined}
        title={dialog === 'disable' ? t('disable.title') : t('regen.title')}
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)} disabled={busy}>
              {dialog === 'disable' ? t('disable.keep') : t('regen.keep')}
            </Button>
            <Button
              type="submit"
              form="mfa-dialog-form"
              variant={dialog === 'disable' ? 'danger' : 'primary'}
              disabled={busy}
            >
              {dialog === 'disable' ? t('disable.confirm') : t('regen.confirm')}
            </Button>
          </>
        }
      >
        <p>{dialog === 'disable' ? t('disable.text') : t('regen.text')}</p>
        <form id="mfa-dialog-form" noValidate onSubmit={submitDialog}>
          <Field
            id="dialog-code"
            label={t('dialogCode')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className={codeInputClass}
            value={dialogCode}
            onChange={(e) => setDialogCode(e.target.value.replace(/\D/g, ''))}
            error={dialogError}
            disabled={busy}
          />
        </form>
      </Dialog>
    </>
  );
};

export default AdminSecurityPage;
