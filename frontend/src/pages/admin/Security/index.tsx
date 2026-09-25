import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
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
const codeError = (error: unknown) => {
  const message = Helper.getErrorMessage(error, 'Could not check the code. Please try again.');
  if (Helper.getErrorCode(error) === 'MFA_CODE_INVALID') {
    return `${message} ${Helper.getFieldErrors(error).code ?? ''}`.trim();
  }
  return Helper.getFieldErrors(error).code ?? message;
};

const StatusPill = ({ on }: { on: boolean }) => (
  <span
    className={Helper.cn(
      'inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold',
      on ? 'bg-status-ready-bg text-status-ready-ink' : 'bg-status-placed-bg text-status-placed-ink',
    )}
  >
    {on ? <CheckIcon size={14} /> : <InfoIcon size={14} />}
    {on ? 'On' : 'Off'}
  </span>
);

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
      Notification.error({ text: Helper.getErrorMessage(error, 'Could not start the set-up. Please try again.') });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!CODE_REGEX.test(confirmCode)) {
      setConfirmError('A code is six digits.');
      return;
    }
    setBusy(true);
    try {
      const response = await MfaApi.enable(confirmCode);
      setNewCodes(response.data.codes);
      setConfirmError(undefined);
      Notification.success({ text: 'Code accepted. Save the recovery codes to finish.' });
    } catch (error) {
      setConfirmError(codeError(error));
      setConfirmCode('');
    } finally {
      setBusy(false);
    }
  };

  const finishSetup = () => {
    setSetup(null);
    setNewCodes(null);
    Notification.success({ text: 'Two-step verification is on. You will be asked for a code at the next sign-in.' });
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
      setDialogError('A code is six digits.');
      return;
    }
    setBusy(true);
    try {
      if (dialog === 'disable') {
        await MfaApi.disable(dialogCode);
        setNewCodes(null);
        Notification.success({ text: 'Two-step verification is off.' });
      } else {
        const response = await MfaApi.regenerateRecoveryCodes(dialogCode);
        setNewCodes(response.data.codes);
        Notification.success({ text: 'Ten new recovery codes. The old ones no longer work.' });
      }
      setDialog(null);
      load();
    } catch (error) {
      setDialogError(codeError(error));
      setDialogCode('');
    } finally {
      setBusy(false);
    }
  };

  const enabled = status.kind === 'ready' && status.data.enabled;

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-overline text-ink-muted uppercase">Your account</p>
        <h1 className="font-hand text-h1">Security</h1>
      </div>

      {status.kind === 'loading' && (
        <Card aria-busy="true" className="flex flex-col gap-3 p-4 md:p-6">
          <span className="sr-only">Loading two-step verification</span>
          <div className="bg-surface-sunken h-6 w-60 max-w-full rounded-sm" />
          <div className="bg-surface-sunken h-4 w-full rounded-sm" />
          <div className="bg-surface-sunken h-11 w-72 max-w-full rounded-sm" />
        </Card>
      )}

      {status.kind === 'error' && (
        <DataState
          variant="error"
          title="Couldn't load two-step verification"
          text="Check your connection and try again."
          action={
            <Button variant="secondary" size="sm" onClick={load}>
              Try again
            </Button>
          }
        />
      )}

      {status.kind === 'ready' && (
        <Card aria-labelledby="mfa-title" className="flex flex-col gap-4 p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex max-w-155 flex-col gap-2">
              <h2 id="mfa-title" className="text-[20px] font-bold">
                Two-step verification
              </h2>
              <p className="text-small text-ink-muted">
                A second step after your password, from an app on your phone. An admin can approve stalls, deactivate
                customers and change what the platform charges, so a password on its own is thin.
              </p>
            </div>
            <StatusPill on={enabled && !setup} />
          </div>

          {!enabled && !setup && (
            <div>
              <Button onClick={start} disabled={busy}>
                {busy ? 'Starting…' : 'Turn on two-step verification'}
              </Button>
            </div>
          )}

          {setup && (
            <ol className="m-0 flex list-none flex-col gap-6 p-0">
              <Step
                n={1}
                title="Scan this with your authenticator"
                text="Google Authenticator, Microsoft Authenticator, Authy, 1Password — any of them. Nothing is sent anywhere: the code below is drawn by your own browser."
              >
                <div className="flex flex-wrap items-start gap-4">
                  <QrCode value={setup.otpauthUri} label="QR code for your authenticator app" />
                  <div className="flex min-w-55 flex-1 flex-col gap-2">
                    <p className="text-small">
                      <b>Cannot scan?</b> Type this key in by hand:
                    </p>
                    <p className="font-mono text-[15px] tracking-[0.06em] break-words">
                      {setup.secret.replace(/(.{4})/g, '$1 ').trim()}
                    </p>
                    <dl className="text-small m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                      <dt className="text-ink-muted">Type</dt>
                      <dd className="m-0">Time-based (TOTP)</dd>
                      <dt className="text-ink-muted">Algorithm</dt>
                      <dd className="m-0">SHA1</dd>
                      <dt className="text-ink-muted">Digits</dt>
                      <dd className="m-0">6</dd>
                      <dt className="text-ink-muted">Period</dt>
                      <dd className="m-0">30 seconds</dd>
                    </dl>
                  </div>
                </div>
              </Step>

              <Step
                n={2}
                title="Type the code it shows"
                text="This proves the phone and the server agree on the time before anything is switched on."
              >
                <form noValidate onSubmit={confirm} className="flex flex-wrap items-end gap-2">
                  <div className="max-w-55">
                    <Field
                      id="confirm"
                      label="Six-digit code"
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
                    {newCodes ? 'Confirmed' : 'Confirm'}
                  </Button>
                </form>
              </Step>

              <Step
                n={3}
                title="Save your recovery codes"
                text="Ten codes, each usable once. They are the only way back in if you lose the phone — and this platform has one admin account, so losing it locks everybody out."
              >
                {newCodes ? (
                  <>
                    <RecoveryCodes codes={newCodes} />
                    <div>
                      <Button size="sm" onClick={finishSetup}>
                        I have saved them
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-small text-ink-muted">The codes appear here once the code above is confirmed.</p>
                )}
              </Step>
            </ol>
          )}

          {enabled && !setup && (
            <div className="flex flex-col gap-4">
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-ink-muted">Recovery codes left</dt>
                <dd className="m-0">
                  <b>{status.data.recoveryCodesLeft}</b> of 10
                </dd>
              </dl>
              {newCodes && <RecoveryCodes codes={newCodes} />}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => openDialog('regen')}>
                  Make new recovery codes
                </Button>
                <Button variant="danger" size="sm" onClick={() => openDialog('disable')}>
                  Turn it off
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Dialog
        open={dialog !== null}
        tone={dialog === 'disable' ? 'danger' : undefined}
        title={dialog === 'disable' ? 'Turn off two-step verification?' : 'Make new recovery codes?'}
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)} disabled={busy}>
              {dialog === 'disable' ? 'Leave it on' : 'Keep the old ones'}
            </Button>
            <Button
              type="submit"
              form="mfa-dialog-form"
              variant={dialog === 'disable' ? 'danger' : 'primary'}
              disabled={busy}
            >
              {dialog === 'disable' ? 'Turn it off' : 'Make new codes'}
            </Button>
          </>
        }
      >
        <p>
          {dialog === 'disable'
            ? 'Your password becomes the only thing standing between anyone and the approvals, the customer accounts and the platform prices.'
            : 'The ten you have now stop working straight away. Save the new ones before you close this screen.'}
        </p>
        <form id="mfa-dialog-form" noValidate onSubmit={submitDialog}>
          <Field
            id="dialog-code"
            label="Code from your authenticator"
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
