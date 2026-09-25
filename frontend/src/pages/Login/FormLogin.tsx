import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/input';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Kiểm tra phía client, cùng luật với LoginRequest của backend. */
const validate = (email: string, password: string): FieldErrors => {
  const errors: FieldErrors = {};
  if (!email.trim()) errors.email = 'Enter your email.';
  else if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
};

const FormLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const clientErrors = validate(email, password);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await AuthApi.login({ email: email.trim(), password, rememberMe });
      // Có "Remember me" → giữ phiên sau khi đóng trình duyệt; không → chỉ trong phiên trình duyệt này
      Session.save(response.data, rememberMe);

      Notification.success({ text: response.message || 'Signed in.' });
      navigate('/');
    } catch (error) {
      // 400: lỗi theo field (VALIDATION_ERROR) → hiện dưới ô nhập; 401/403: message chung của backend
      setErrors(Helper.getFieldErrors(error));
      Notification.error({ text: Helper.getErrorMessage(error, 'Could not sign you in. Please try again.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        id="email"
        label="Email"
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
        label="Password"
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
          Remember me
        </Checkbox>
        <Link to="/forgot-password" className="text-small text-brand underline">
          Forgot password?
        </Link>
      </div>


      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>

    </form>
  );
};

export default FormLogin;
