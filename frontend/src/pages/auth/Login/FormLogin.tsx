import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/input';
import { ADMIN_VERIFY_PATH } from '@/constants/nav';
import type { LoginRedirectState } from '@/layout/RequireAuth';
import Helper from '@/utils/helper';
import { splitLoginResult } from '@/utils/mfa';
import Notification from '@/utils/notification';
import Session from '@/utils/session';
import validateLogin, { type LoginFieldErrors as FieldErrors } from './validateLogin';

const FormLogin = () => {
  const { t } = useTranslation('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const clientErrors = validateLogin(email, password);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await AuthApi.login({ email: email.trim(), password, rememberMe });
      const { pending, session } = splitLoginResult(response.data, rememberMe);
      if (pending) {
        // FR-008: admin đã bật xác thực hai bước đăng nhập ở đây → cũng phải qua màn nhập mã
        navigate(ADMIN_VERIFY_PATH, { state: pending });
        return;
      }
      // Có "Remember me" → giữ phiên sau khi đóng trình duyệt; không → chỉ trong phiên trình duyệt này
      Session.save(session, rememberMe);

      Notification.success({ text: response.message || t('toast.signedIn') });
      // Bị RequireAuth chuyển tới đây thì quay lại trang đang mở dở
      navigate((location.state as LoginRedirectState | null)?.from ?? '/', { replace: true });
    } catch (error) {
      // 400: lỗi theo field (VALIDATION_ERROR) → hiện dưới ô nhập; 401/403: message chung của backend
      setErrors(Helper.getFieldErrors(error));
      Notification.error({ text: Helper.getErrorMessage(error, t('toast.failed')) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        id="email"
        label={t('fields.email')}
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        disabled={isSubmitting}
      />
      <Field
        id="password"
        label={t('fields.password')}
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        disabled={isSubmitting}
      />

      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <Checkbox
          id="rememberMe"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          disabled={isSubmitting}
        >
          {t('rememberMe')}
        </Checkbox>
        <Link to="/forgot-password" className="text-small text-brand underline">
          {t('forgotPassword')}
        </Link>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
};

export default FormLogin;
