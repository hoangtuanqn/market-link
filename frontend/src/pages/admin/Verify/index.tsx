import { useState, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { ADMIN_HOME_PATH, ADMIN_LOGIN_PATH } from '@/constants/nav';
import useTotpCountdown from '@/hooks/useTotpCountdown';
import AdminAuthShell from '@/layout/AdminAuthShell';
import Helper from '@/utils/helper';
import type { PendingMfa } from '@/utils/mfa';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

type Alert = { title: string; text: string };

const CODE_REGEX = /^\d{6}$/;

/**
 * FR-008 — bước 2 đăng nhập admin (prototype admin/verify.html). Bước mật khẩu chưa cấp phiên, chỉ trả mfaToken (sống 5
 * phút, dùng một lần) qua router state; vào thẳng hoặc F5 thì về lại trang đăng nhập. Sai 5 lần → backend khoá 15
 * phút.
 */
const AdminVerifyPage = () => {
  const { t } = useTranslation('AdminVerify');
  const pending = useLocation().state as PendingMfa | null;
  const navigate = useNavigate();
  const secondsLeft = useTotpCountdown();
  const [onRecovery, setOnRecovery] = useState(false);
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [locked, setLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!pending?.mfaToken) return <Navigate to={ADMIN_LOGIN_PATH} replace />;

  const swap = () => {
    setOnRecovery((v) => !v);
    setFieldError(undefined);
    setAlert(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAlert(null);

    const value = (onRecovery ? recoveryCode : code).trim();
    if (!value) {
      setFieldError(t('error.empty'));
      return;
    }
    if (!onRecovery && !CODE_REGEX.test(value)) {
      setFieldError(t('error.sixDigits'));
      return;
    }
    setFieldError(undefined);

    setIsSubmitting(true);
    try {
      const response = await AuthApi.verifyMfa({
        mfaToken: pending.mfaToken,
        ...(onRecovery ? { recoveryCode: value } : { code: value }),
      });
      Session.save(response.data, pending.remember);
      Notification.success({ text: response.message || t('toast.signedIn') });
      navigate(ADMIN_HOME_PATH, { replace: true });
    } catch (error) {
      const message = Helper.getErrorMessage(error, t('error.check'));
      switch (Helper.getErrorCode(error)) {
        case 'MFA_CODE_INVALID': {
          const left = Helper.getFieldErrors(error).code ?? '';
          setAlert({
            title: message,
            text: onRecovery ? `${left} ${t('alert.recoveryOnce')}` : `${left} ${t('alert.checkClock')}`,
          });
          setCode('');
          break;
        }
        case 'MFA_LOCKED':
          setLocked(true);
          setAlert({ title: t('alert.locked'), text: message });
          break;
        case 'MFA_TOKEN_INVALID':
          // quá 5 phút hoặc token đã dùng: phải nhập lại mật khẩu
          Notification.error({ text: message });
          navigate(ADMIN_LOGIN_PATH, { replace: true });
          break;
        default:
          setFieldError(Helper.getFieldErrors(error).code ?? Helper.getFieldErrors(error).recoveryCode);
          Notification.error({ text: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminAuthShell>
      <div className="flex flex-col gap-2">
        <p className="text-overline text-ink-muted uppercase">{t('overline')}</p>
        <h1 className="font-hand text-h1">{t('title')}</h1>
        <p className="text-small text-ink-muted">
          <Trans
            t={t}
            i18nKey="signedInAs"
            values={{ email: pending.email }}
            components={{ b: <b className="text-ink" /> }}
          />{' '}
          <Link to={ADMIN_LOGIN_PATH} replace className="text-brand underline">
            {t('notYou')}
          </Link>
        </p>
      </div>

      <form noValidate autoComplete="off" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {alert && (
          <Banner variant="danger" title={alert.title}>
            {alert.text}
          </Banner>
        )}

        {onRecovery ? (
          <Field
            key="recovery"
            id="rcode"
            label={t('recovery.label')}
            required
            autoFocus
            autoComplete="off"
            maxLength={14}
            placeholder="xxxx-xxxx-xxxx"
            className="text-center font-mono text-[18px] tracking-[0.08em]"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            error={fieldError}
            hint={t('recovery.hint')}
            disabled={isSubmitting || locked}
          />
        ) : (
          <Field
            key="code"
            id="code"
            label={t('code.label')}
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            placeholder="000000"
            className="text-center font-mono text-[28px] tracking-[0.32em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            error={fieldError}
            hint={t('code.hint', { seconds: secondsLeft })}
            disabled={isSubmitting || locked}
          />
        )}

        <Button type="submit" disabled={isSubmitting || locked} className="w-full">
          {isSubmitting ? t('submitting') : t('submit')}
        </Button>
        {locked && (
          <p className="text-small text-ink-muted">
            {t('locked')}{' '}
            <Link to={ADMIN_LOGIN_PATH} replace className="text-brand underline">
              {t('backToSignIn')}
            </Link>
          </p>
        )}

        <p className="text-small">
          <button
            type="button"
            onClick={swap}
            className="text-brand hover:text-brand-strong cursor-pointer border-0 bg-transparent p-0 font-bold underline"
          >
            {onRecovery ? t('swap.toCode') : t('swap.toRecovery')}
          </button>
        </p>
      </form>
    </AdminAuthShell>
  );
};

export default AdminVerifyPage;
