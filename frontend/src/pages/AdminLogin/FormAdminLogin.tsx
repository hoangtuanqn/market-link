import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { USER_ROLE } from '@/constants/enums';
import validateLogin, { type LoginFieldErrors } from '@/pages/Login/validateLogin';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

/**
 * FR-004 — đăng nhập admin. Dùng chung POST /auth/login với Customer/Farmer; tài khoản không phải admin thì không lưu
 * phiên và thu hồi luôn token vừa cấp. Chặn thật vẫn là 403 ở backend (FR-005).
 */
const FormAdminLogin = () => {
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
      const response = await AuthApi.login({ email: email.trim(), password, rememberMe: false });
      const { accessToken, user } = response.data;

      if (user.role !== USER_ROLE.ADMIN) {
        // bỏ qua lỗi: token vẫn hết hạn theo thời gian, quan trọng là không lưu phiên
        await AuthApi.revokeSession(accessToken).catch(() => undefined);
        setNotAdmin(true);
        return;
      }

      Session.save(response.data, false);
      Notification.success({ text: response.message || 'Signed in.' });
      navigate('/admin', { replace: true });
    } catch (error) {
      setErrors(Helper.getFieldErrors(error));
      Notification.error({ text: Helper.getErrorMessage(error, 'Could not sign you in. Please try again.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {notAdmin && (
        <Banner variant="danger" title="This account is not an admin">
          This sign-in is only for platform admins.{' '}
          <Link to="/login" className="text-danger underline">
            Customers and Farmers sign in here
          </Link>
          .
        </Banner>
      )}
      <Field
        id="email"
        label="Admin email"
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
        label="Password"
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        disabled={isSubmitting}
      />
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
};

export default FormAdminLogin;
