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
 * FR-004 — đăng nhập admin. Dùng chung POST /auth/login với Customer/Farmer nhưng gửi requiredRole = admin: tài khoản
 * không phải admin bị backend trả 403 ROLE_NOT_ALLOWED trước khi cấp token, nên phiên đang có trong trình duyệt (cookie
 * refresh) không bị ghi đè. Chặn thật vẫn là 403 ở từng API admin (FR-005).
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
      // Không có "Remember me": phiên admin chỉ sống trong phiên trình duyệt này
      const response = await AuthApi.login({
        email: email.trim(),
        password,
        rememberMe: false,
        requiredRole: USER_ROLE.ADMIN,
      });
      const { pending, session } = splitLoginResult(response.data, false);
      if (pending) {
        // FR-008: đã bật xác thực hai bước → chưa có phiên, sang màn nhập mã
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
