import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router';
import MfaApi from '@/api-requests/mfa.requests';
import QrCode from '@/components/QrCode';
import { CheckIcon, ShieldIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { USER_ROLE } from '@/constants/enums';
import { ADMIN_HOME_PATH, ADMIN_LOGIN_PATH, ADMIN_SECURITY_PATH } from '@/constants/nav';
import useLogout from '@/hooks/useLogout';
import useSession from '@/hooks/useSession';
import AdminAuthSplitShell, { AdminAuthCardHeader } from '@/layout/AdminAuthSplitShell';
import type { MfaSetupType, MfaStatusType } from '@/types/auth.types';
import Notification from '@/utils/notification';
import Session from '@/utils/session';
import { CODE_REGEX, codeError, codeInputClass } from '../Security/mfaCode';
import RecoveryCodes from '../Security/RecoveryCodes';

type Status = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: MfaStatusType };

const Step = ({ n, title, text, children }: { n: number; title: string; text: string; children?: ReactNode }) => (
  <li className="flex gap-3">
    <span
      aria-hidden="true"
      className="bg-brand text-on-brand grid size-7 flex-none place-items-center rounded-full text-[14px] font-bold"
    >
      {n}
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <h3 className="text-[16px] font-bold">{title}</h3>
      <p className="text-small text-ink-muted">{text}</p>
      {children}
    </div>
  </li>
);

/**
 * FR-008 — mandatory first-time two-step verification setup for an admin who has never configured it. Reached only
 * right after sign-in (FormAdminLogin) or by AdminLayout's route guard (mfaSetupRequired). An admin who later turns
 * this off from /admin/security and wants it back on lands here too, from the "Turn on" button there — so this page
 * only refuses to run the wizard again when the account is _already_ enabled (prototype admin/security.html).
 */
const AdminSetup2FAPage = () => {
  const { t } = useTranslation('AdminSecurity');
  const navigate = useNavigate();
  const { user, isLoggedIn } = useSession();
  const logout = useLogout(ADMIN_LOGIN_PATH);

  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [setup, setSetup] = useState<MfaSetupType | null>(null);
  const startedRef = useRef(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmError, setConfirmError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);

  const fetchStatus = useCallback(() => {
    MfaApi.status()
      .then((response) => setStatus({ kind: 'ready', data: response.data }))
      .catch(() => setStatus({ kind: 'error' }));
  }, []);

  useEffect(fetchStatus, [fetchStatus]);

  // Auto-start: arriving here already means "set it up now", no extra click needed.
  useEffect(() => {
    if (status.kind !== 'ready' || status.data.enabled || startedRef.current) return;
    startedRef.current = true;
    MfaApi.setup()
      .then((response) => setSetup(response.data))
      .catch((error) => Notification.error({ text: codeError(error, t('error.start')) }));
  }, [status, t]);

  if (!isLoggedIn) return <Navigate to={ADMIN_LOGIN_PATH} replace />;
  if (user?.role !== USER_ROLE.ADMIN) return <Navigate to="/403" replace />;

  const copySecret = async () => {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      Notification.success({ text: t('setup.secretCopied') });
    } catch {
      // clipboard permission denied: the secret is already shown as selectable text
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
      // Every session opened before this was signed out, this one included: keep going on the new token
      if (response.data.accessToken && user) Session.refreshed({ accessToken: response.data.accessToken, user });
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

  return (
    <AdminAuthSplitShell cardClassName="max-w-160">
      {newCodes ? (
        <>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="bg-status-ready-bg text-status-ready-ink mb-2 flex size-11 items-center justify-center rounded-full">
              <CheckIcon size={22} />
            </span>
            <h1 className="text-h2 text-ink font-bold">{t('setup.completeTitle')}</h1>
            <p className="text-small text-ink-muted">{t('setup.completeText')}</p>
          </div>

          <RecoveryCodes codes={newCodes} />

          <div>
            <Button onClick={() => navigate(ADMIN_HOME_PATH, { replace: true })}>{t('setup.goToDashboard')}</Button>
          </div>
        </>
      ) : (
        <>
          <AdminAuthCardHeader icon={<ShieldIcon size={20} />} eyebrow={t('setup.overline')} heading={t('setup.title')}>
            {t('setup.notYou')}{' '}
            <button type="button" onClick={() => void logout()} className="text-brand underline">
              {t('setup.signOut')}
            </button>
          </AdminAuthCardHeader>

          {status.kind === 'loading' && (
            <div aria-busy="true" className="flex flex-col gap-3">
              <span className="sr-only">{t('loading')}</span>
              <div className="bg-surface-sunken h-40 w-40 rounded-sm" />
              <div className="bg-surface-sunken h-4 w-full rounded-sm" />
            </div>
          )}

          {status.kind === 'error' && (
            <p className="text-danger text-small">
              {t('loadError.text')}{' '}
              <button type="button" onClick={fetchStatus} className="underline">
                {t('loadError.retry')}
              </button>
            </p>
          )}

          {status.kind === 'ready' && status.data.enabled && (
            <div className="flex flex-col gap-4">
              <p className="text-small text-ink-muted">{t('setup.alreadyActive')}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => navigate(ADMIN_HOME_PATH, { replace: true })}>
                  {t('setup.backToDashboard')}
                </Button>
                <Link to={ADMIN_SECURITY_PATH} className="text-brand text-small underline">
                  {t('setup.manageSecurity')}
                </Link>
              </div>
            </div>
          )}

          {status.kind === 'ready' && !status.data.enabled && setup && (
            <ol className="m-0 flex list-none flex-col gap-4 p-0">
              <Step n={1} title={t('step1.title')} text={t('step1.text')}>
                <div className="flex flex-wrap items-start gap-4">
                  <QrCode value={setup.otpauthUri} label={t('step1.qr')} />
                  <div className="flex min-w-55 flex-1 flex-col gap-2">
                    <p className="text-small">
                      <Trans t={t} i18nKey="step1.manual" components={{ b: <b /> }} />
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-[15px] tracking-[0.06em] break-words">
                        {setup.secret.replace(/(.{4})/g, '$1 ').trim()}
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => void copySecret()}>
                        {t('setup.copySecret')}
                      </Button>
                    </div>
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
                      disabled={busy}
                    />
                  </div>
                  <Button type="submit" disabled={busy}>
                    {t('step2.confirm')}
                  </Button>
                </form>
              </Step>

              <Step n={3} title={t('step3.title')} text={t('step3.text')}>
                <p className="text-small text-ink-muted">{t('step3.pending')}</p>
              </Step>
            </ol>
          )}
        </>
      )}
    </AdminAuthSplitShell>
  );
};

export default AdminSetup2FAPage;
