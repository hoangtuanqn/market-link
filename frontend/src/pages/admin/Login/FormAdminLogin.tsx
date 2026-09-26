import { useState, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { USER_ROLE } from '@/constants/enums';
import { ADMIN_HOME_PATH, ADMIN_VERIFY_PATH } from '@/constants/nav';
import validateLogin, { type LoginFieldErrors } from '@/pages/auth/Login/validateLogin';
import Helper from '@/utils/helper';
import { splitLoginResult } from '@/utils/mfa';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

/**
 * FR-004 — admin sign-in. Shares POST /auth/login with Customer/Farmer but sends requiredRole = admin: an account that
 * is not an admin gets 403 ROLE_NOT_ALLOWED from the backend before any token is issued, so the session already in the
 * browser (the refresh cookie) is not overwritten. The real block is still the 403 at each admin API (FR-005).
 */
const FormAdminLogin = () => {
  const { t } = useTranslation('AdminLogin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [notAdmin, setNotAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNotAdmin(false);

    const clientErrors = validateLogin(email, password);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      // No "Remember me": the admin session only lives for this browser session
      const response = await AuthApi.login({
        email: email.trim(),
        password,
        rememberMe: false,
        requiredRole: USER_ROLE.ADMIN,
      });
      const { pending, session } = splitLoginResult(response.data, false);
      if (pending) {
        // FR-008: two-step verification is on → no session yet, go to the code entry screen
        navigate(ADMIN_VERIFY_PATH, { state: pending });
        return;
      }
      Session.save(session, false);
      Notification.success({ text: response.message || t('form.signedIn') });
      navigate(ADMIN_HOME_PATH, { replace: true });
    } catch (error) {
      if (Helper.getErrorCode(error) === 'ROLE_NOT_ALLOWED') {
        setNotAdmin(true);
        return;
      }
      setErrors(Helper.getFieldErrors(error));
      Notification.error({ text: Helper.getErrorMessage(error, t('form.error')) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {notAdmin && (
        <Banner variant="danger" title={t('notAdmin.title')}>
          <Trans
            t={t}
            i18nKey="notAdmin.text"
            components={{ link: <Link to="/login" className="text-danger underline" /> }}
          />
        </Banner>
      )}
      <Field
        id="email"
        label={t('form.email')}
        type="email"
        required
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        disabled={isSubmitting}
      />
      <Field
        id="password"
        label={t('form.password')}
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        disabled={isSubmitting}
      />
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? t('form.submitting') : t('form.submit')}
      </Button>
    </form>
  );
};

export default FormAdminLogin;
