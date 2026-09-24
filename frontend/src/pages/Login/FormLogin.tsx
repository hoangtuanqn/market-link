import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import Helper from '@/utils/helper';
import LocalStorage from '@/utils/localstorage';
import Notification from '@/utils/notification';

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
      const response = await AuthApi.login({ email: email.trim(), password });
      const { accessToken, user } = response.data;

      LocalStorage.setItem('login', 'true');
      LocalStorage.setItem('access_token', accessToken);
      LocalStorage.setItem('user', JSON.stringify(user));

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
      <Field id="email" label="Email" required error={errors.email}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          disabled={isSubmitting}
        />
      </Field>

      <Field id="password" label="Password" required error={errors.password}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          disabled={isSubmitting}
        />
      </Field>

      <Link to="/forgot-password" className="text-small text-brand self-start underline">
        Forgot password?
      </Link>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
};

export default FormLogin;
