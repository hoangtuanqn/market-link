import type { TFunction } from 'i18next';
import { useEffect, useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

type FormErrors = Partial<Record<'currentPassword' | 'newPassword' | 'confirmPassword', string>>;

/** Same password rules as sign-up / reset password (the backend's RegisterRules). */
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

const validate = (t: TFunction<'CustomerAccount'>, current: string, next: string, confirm: string): FormErrors => {
  const errors: FormErrors = {};
  if (!current) errors.currentPassword = t('password.errors.currentRequired');
  if (!next) errors.newPassword = t('password.errors.newRequired');
  else if (next.length < PASSWORD_MIN || next.length > PASSWORD_MAX)
    errors.newPassword = t('password.errors.length', {
      min: PASSWORD_MIN,
      max: PASSWORD_MAX,
    });
  else if (current && next === current) errors.newPassword = t('password.errors.same');
  if (!confirm) errors.confirmPassword = t('password.errors.confirmRequired');
  else if (confirm !== next) errors.confirmPassword = t('password.errors.mismatch');
  return errors;
};

/**
 * The change-password page (/account/password), opened from the "Password & security" frame on the Account page. The
 * ".." link is relative to the path so it returns to the exact page that opened it. After the change the backend signs
 * out every device (including this one), so the FE clears the session and sends the user to the sign-in page.
 */
const ChangePasswordPage = () => {
  const { t } = useTranslation('CustomerAccount');
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // On entering the page put the cursor in the first box, so they can type right away
  useEffect(() => {
    document.getElementById('currentPassword')?.focus();
  }, []);

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clientErrors = validate(t, currentPassword, newPassword, confirmPassword);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await AuthApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      Session.clear();
      Notification.success({ text: response.message || t('password.changed') });
      navigate('/login', { replace: true });
    } catch (error) {
      // 400: the current password is wrong / the new password is invalid → error under the input
      setErrors(Helper.getFieldErrors(error));
      Notification.error({
        text: Helper.getErrorMessage(error, t('password.failed')),
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to=".." relative="path" className="text-brand underline">
          {t('title')}
        </Link>{' '}
        · {t('password.title')}
      </p>

      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('password.title')}</h1>
        <p className="text-body-lg">{t('password.intro')}</p>
      </div>

      <Card className="p-6">
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Tell the password manager which account the password belongs to */}
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={Session.getUser()?.email ?? ''}
            readOnly
            hidden
          />

          <Field
            id="currentPassword"
            label={t('password.current')}
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            error={errors.currentPassword}
            disabled={isSubmitting}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              id="newPassword"
              label={t('password.new')}
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={errors.newPassword}
              hint={t('password.hint', { min: PASSWORD_MIN, max: PASSWORD_MAX })}
              disabled={isSubmitting}
            />
            <Field
              id="confirmPassword"
              label={t('password.repeat')}
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('password.submitting') : t('password.submit')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('..', { relative: 'path' })}
              disabled={isSubmitting}
            >
              {t('password.cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ChangePasswordPage;
