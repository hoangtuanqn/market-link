import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import MfaApi from '@/api-requests/mfa.requests';
import { CheckIcon, InfoIcon } from '@/components/icons';
import QrCode from '@/components/QrCode';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/input';
import type { MfaSetupType, MfaStatusType } from '@/types/auth.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import RecoveryCodes from './RecoveryCodes';

type Status = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: MfaStatusType };
type DialogKind = 'disable' | 'regen' | null;

const CODE_REGEX = /^\d{6}$/;
const codeInputClass = 'text-center font-mono text-[28px] tracking-[0.32em]';

/** Lỗi khi gửi mã 6 số: sai (kèm số lần còn lại), bị khoá, hay trạng thái đã đổi ở tab khác. */
const codeError = (error: unknown, fallback: string) => {
  const message = Helper.getErrorMessage(error, fallback);
  if (Helper.getErrorCode(error) === 'MFA_CODE_INVALID') {
    return `${message} ${Helper.getFieldErrors(error).code ?? ''}`.trim();
  }
  return Helper.getFieldErrors(error).code ?? message;
};

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

const Step = ({ n, title, text, children }: { n: number; title: string; text: string; children?: ReactNode }) => (
  <li className="flex gap-3">
    <span
      aria-hidden="true"
      className="bg-brand text-on-brand grid size-7 flex-none place-items-center rounded-full text-[14px] font-bold"
    >
      {n}
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <h3 className="text-[17px] font-bold">{title}</h3>
      <p className="text-small text-ink-muted">{text}</p>
      {children}
    </div>
  </li>
);

/**
 * FR-008 — admin bật / tắt xác thực hai bước (prototype admin/account.html, mục "Two-step verification"). Khoá bí mật
 * chỉ hiện lúc cài, mã khôi phục chỉ hiện một lần; backend chỉ lưu bản mã hoá / bản băm.
 */
const AdminSecurityPage = () => {
  const { t } = useTranslation('AdminSecurity');
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [setup, setSetup] = useState<MfaSetupType | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmError, setConfirmError] = useState<string>();
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [dialogCode, setDialogCode] = useState('');
  const [dialogError, setDialogError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // chỉ setState trong callback của promise (trạng thái ban đầu đã là loading)
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

  const start = async () => {
    setBusy(true);
    try {
      const response = await MfaApi.setup();
      setSetup(response.data);
      setNewCodes(null);
      setConfirmCode('');
      setConfirmError(undefined);
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, t('error.start')) });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!CODE_REGEX.test(confirmCode)) {
      setConfirmError(t('error.sixDigits'));
      return;
    }
    setBusy(true);
    try {
      const response = await MfaApi.enable(confirmCode);
      setNewCodes(response.data.codes);
      setConfirmError(undefined);
      Notification.success({ text: t('toast.accepted') });
    } catch (error) {
      setConfirmError(codeError(error, t('error.check')));
      setConfirmCode('');
    } finally {
      setBusy(false);
    }
  };

  const finishSetup = () => {
    setSetup(null);
    setNewCodes(null);
    Notification.success({ text: t('toast.on') });
    load();
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
        <h1 className="font-hand text-h1">{t('title')}</h1>
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
            <StatusPill on={enabled && !setup} />
          </div>

          {!enabled && !setup && (
            <div>
              <Button onClick={start} disabled={busy}>
                {busy ? t('mfa.starting') : t('mfa.turnOn')}
              </Button>
            </div>
          )}

          {setup && (
            <ol className="m-0 flex list-none flex-col gap-6 p-0">
              <Step n={1} title={t('step1.title')} text={t('step1.text')}>
                <div className="flex flex-wrap items-start gap-4">
                  <QrCode value={setup.otpauthUri} label={t('step1.qr')} />
                  <div className="flex min-w-55 flex-1 flex-col gap-2">
                    <p className="text-small">
                      <Trans t={t} i18nKey="step1.manual" components={{ b: <b /> }} />
                    </p>
                    <p className="font-mono text-[15px] tracking-[0.06em] break-words">
                      {setup.secret.replace(/(.{4})/g, '$1 ').trim()}
                    </p>
                    <dl className="text-small m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                      <dt className="text-ink-muted">{t('step1.type')}</dt>
                      <dd className="m-0">{t('step1.typeValue')}</dd>
                      <dt className="text-ink-muted">{t('step1.algorithm')}</dt>
                      <dd className="m-0">SHA1</dd>
                      <dt className="text-ink-muted">{t('step1.digits')}</dt>
                      <dd className="m-0">6</dd>
                      <dt className="text-ink-muted">{t('step1.period')}</dt>
                      <dd className="m-0">{t('step1.seconds', { count: 30 })}</dd>
                    </dl>
                  </div>
                </div>
              </Step>

              <Step n={2} title={t('step2.title')} text={t('step2.text')}>
                <form noValidate onSubmit={confirm} className="flex flex-wrap items-end gap-2">
                  <div className="max-w-55">
                    <Field
                      id="confirm"
                      label={t('step2.code')}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      className={codeInputClass}
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                      error={confirmError}
                      disabled={busy || newCodes !== null}
                    />
                  </div>
                  <Button type="submit" disabled={busy || newCodes !== null}>
                    {newCodes ? t('step2.confirmed') : t('step2.confirm')}
                  </Button>
                </form>
              </Step>

              <Step n={3} title={t('step3.title')} text={t('step3.text')}>
                {newCodes ? (
                  <>
                    <RecoveryCodes codes={newCodes} />
                    <div>
                      <Button size="sm" onClick={finishSetup}>
                        {t('step3.saved')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-small text-ink-muted">{t('step3.pending')}</p>
                )}
              </Step>
            </ol>
          )}

          {enabled && !setup && (
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
