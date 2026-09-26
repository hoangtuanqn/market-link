import { useState, type SubmitEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Navigate, useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

type FormErrors = Partial<Record<'password' | 'confirmPassword', string>>;

const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

/** Kiểm tra phía client, cùng luật với SetPasswordRequest của backend. */
const validate = (password: string, confirm: string, t: TFunction<'SetPassword'>): FormErrors => {
  const errors: FormErrors = {};
  if (!password) errors.password = t('errors.passwordRequired');
  else if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    errors.password = t('errors.passwordLength', { min: PASSWORD_MIN, max: PASSWORD_MAX });
  if (!confirm) errors.confirmPassword = t('errors.confirmRequired');
  else if (confirm !== password) errors.confirmPassword = t('errors.confirmMismatch');
  return errors;
};

/** Sau lần đăng nhập Google đầu tiên: mời đặt mật khẩu để đăng nhập được bằng email + mật khẩu. */
const SetPasswordPage = () => {
  const { t } = useTranslation('SetPassword');
  const navigate = useNavigate();
  const [user] = useState(Session.getUser);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chưa đăng nhập thì không đặt mật khẩu được
  if (!Session.getAccessToken()) return <Navigate to="/login" replace />;

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clientErrors = validate(password, confirm, t);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await AuthApi.setPassword({ password, confirmPassword: confirm });
      Session.updateUser({ hasPassword: true });
      Notification.success({ text: response.message || t('toast.saved') });
      navigate('/', { replace: true });
    } catch (error) {
      if (Helper.getErrorCode(error) === 'PASSWORD_ALREADY_SET') {
        Session.updateUser({ hasPassword: true });
        Notification.info({ text: Helper.getErrorMessage(error, t('toast.alreadySet')) });
        navigate('/', { replace: true });
        return;
      }
      setErrors(Helper.getFieldErrors(error));
      Notification.error({ text: Helper.getErrorMessage(error, t('toast.failed')) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto my-4 w-full max-w-115 p-4 md:my-8 md:p-8">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-hand text-h1">{t('title')}</h1>
          <p className="text-small text-ink-muted">
            {user?.email ? (
              <Trans
                t={t}
                i18nKey="introWithEmail"
                values={{ email: user.email }}
                components={{ b: <b className="text-ink break-all" /> }}
              />
            ) : (
              t('intro')
            )}
          </p>
        </div>

        {/* Cho trình quản lý mật khẩu biết mật khẩu mới thuộc tài khoản nào */}
        <input type="email" name="username" autoComplete="username" value={user?.email ?? ''} readOnly hidden />

        <Field
          id="password"
          label={t('fields.password')}
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={t('fields.passwordHint', { min: PASSWORD_MIN, max: PASSWORD_MAX })}
          disabled={isSubmitting}
        />
        <Field
          id="confirmPassword"
          label={t('fields.confirmPassword')}
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirmPassword}
          disabled={isSubmitting}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('saving') : t('submit')}
        </Button>
        <ButtonLink to="/" variant="ghost" className="self-center">
          {t('skip')}
        </ButtonLink>
        <p className="text-ink-muted text-[13px]">{t('note')}</p>
      </form>
    </Card>
  );
};

export default SetPasswordPage;
