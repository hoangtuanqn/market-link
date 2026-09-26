import { useCallback, useEffect, useState, type SubmitEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Link, useSearchParams } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

type Status = 'checking' | 'invalid' | 'unreachable' | 'ready' | 'done';
type FormErrors = Partial<Record<'newPassword' | 'confirmPassword', string>>;

const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

/** Client-side validation, same rules as the backend's ResetPasswordRequest. */
const validate = (password: string, confirm: string, t: TFunction<'ResetPassword'>): FormErrors => {
  const errors: FormErrors = {};
  if (!password) errors.newPassword = t('errors.passwordRequired');
  else if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    errors.newPassword = t('errors.passwordLength', { min: PASSWORD_MIN, max: PASSWORD_MAX });
  if (!confirm) errors.confirmPassword = t('errors.confirmRequired');
  else if (confirm !== password) errors.confirmPassword = t('errors.confirmMismatch');
  return errors;
};

/** FR-007 — set a new password from the emailed link (step 2 of 2). The form only shows once the link is verified. */
const ResetPasswordPage = () => {
  const { t } = useTranslation('ResetPassword');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<Status>(token ? 'checking' : 'invalid');
  // undefined → the default sentence (translated at render); a value → the server's message
  const [invalidMessage, setInvalidMessage] = useState<string>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Ask the backend whether the link is still usable (only reads the token, does not consume it) and get the account's
   * email.
   */
  const verify = useCallback(async () => {
    if (!token) return;
    setStatus('checking');
    try {
      const response = await AuthApi.verifyResetToken(token);
      setEmail(response.data.email);
      setStatus('ready');
    } catch (error) {
      if (Helper.getErrorCode(error) === undefined && Helper.getFieldErrors(error).token === undefined) {
        // No response from the backend (lost network, server down): do not conclude the link is wrong
        setStatus('unreachable');
        return;
      }
      setInvalidMessage(Helper.getErrorMessage(error, '') || undefined);
      setStatus('invalid');
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- calls the API when the page opens, setState comes after an await
    verify();
  }, [verify]);

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clientErrors = validate(password, confirm, t);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await AuthApi.resetPassword({ token, newPassword: password, confirmPassword: confirm });
      // The backend has revoked every sign-in session of the account, also clear the session stored in this browser
      Session.clear();
      Notification.success({ text: response.message || t('toast.reset') });
      setStatus('done');
    } catch (error) {
      if (Helper.getErrorCode(error) === 'INVALID_RESET_TOKEN') {
        setInvalidMessage(Helper.getErrorMessage(error, '') || undefined);
        setStatus('invalid');
        return;
      }
      setErrors(Helper.getFieldErrors(error));
      Notification.error({
        text: Helper.getErrorMessage(error, t('toast.failed')),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto my-4 flex w-full max-w-115 flex-col gap-2 md:my-8">
      {/* Do not send the URL containing the token to another page through the Referer header */}
      <meta name="referrer" content="no-referrer" />
      <span className="text-small text-ink-muted">{t('step', { step: 2, total: 2 })}</span>

      {status === 'checking' && (
        <Card className="mt-2 flex flex-col gap-4 p-4 md:p-8" aria-busy="true">
          <h1 className="font-hand text-h1">{t('checking.title')}</h1>
          <p className="text-small text-ink-muted">{t('checking.text')}</p>
        </Card>
      )}

      {status === 'unreachable' && (
        <Card className="mt-2 flex flex-col gap-4 p-4 md:p-8">
          <h1 className="font-hand text-h1">{t('unreachable.title')}</h1>
          <Banner variant="warning" title={t('unreachable.bannerTitle')}>
            {t('unreachable.bannerText')}
          </Banner>
          <Button className="w-full" onClick={verify}>
            {t('unreachable.retry')}
          </Button>
        </Card>
      )}

      {status === 'invalid' && (
        <Card className="mt-2 flex flex-col gap-4 p-4 md:p-8">
          <h1 className="font-hand text-h1">{t('invalid.title')}</h1>
          <Banner variant="danger" title={invalidMessage ?? t('invalid.defaultMessage')}>
            {t('invalid.bannerText')}
          </Banner>
          <p className="text-small text-ink-muted">{t('invalid.help', { count: 15 })}</p>
          <ButtonLink to="/forgot-password" className="w-full">
            {t('invalid.askNew')}
          </ButtonLink>
          <Link to="/login" className="text-small text-brand underline">
            {t('backToSignIn')}
          </Link>
        </Card>
      )}

      {status === 'done' && (
        <Card className="mt-2 flex flex-col gap-4 p-4 md:p-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-hand text-h1">{t('done.title')}</h1>
            <p className="text-body">
              <Trans t={t} i18nKey="done.text" values={{ email }} components={{ b: <b /> }} />
            </p>
          </div>
          <ButtonLink to="/login" className="w-full">
            {t('done.goToSignIn')}
          </ButtonLink>
        </Card>
      )}

      {status === 'ready' && (
        <Card className="mt-2 p-4 md:p-8">
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="font-hand text-h1">{t('form.title')}</h1>
              <p className="text-small text-ink-muted">
                <Trans
                  t={t}
                  i18nKey="form.intro"
                  values={{ email }}
                  components={{ b: <b className="text-ink break-all" /> }}
                />
              </p>
            </div>

            {/* Tell the password manager which account the new password belongs to */}
            <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

            <Field
              id="newPassword"
              label={t('form.newPassword')}
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.newPassword}
              hint={t('form.passwordHint', { min: PASSWORD_MIN, max: PASSWORD_MAX })}
              disabled={isSubmitting}
            />
            <Field
              id="confirmPassword"
              label={t('form.confirmPassword')}
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors.confirmPassword}
              disabled={isSubmitting}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('form.saving') : t('form.submit')}
            </Button>
            <p className="text-ink-muted text-[13px]">{t('form.note')}</p>
          </form>
        </Card>
      )}
    </div>
  );
};

export default ResetPasswordPage;
