import { useState, type SubmitEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';
import type { UserType } from '@/types/user.types';
import Helper from '@/utils/helper';
import LocalStorage from '@/utils/localstorage';
import Notification from '@/utils/notification';

type FormErrors = Partial<Record<'password' | 'confirmPassword', string>>;

const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

/** Kiểm tra phía client, cùng luật với SetPasswordRequest của backend. */
const validate = (password: string, confirm: string): FormErrors => {
  const errors: FormErrors = {};
  if (!password) errors.password = 'Enter a password.';
  else if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    errors.password = `Password must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`;
  if (!confirm) errors.confirmPassword = 'Confirm your password.';
  else if (confirm !== password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
};

const readStoredUser = (): UserType | null => {
  try {
    const raw = LocalStorage.getItem('user');
    return raw ? (JSON.parse(raw) as UserType) : null;
  } catch {
    return null;
  }
};

/** Sau lần đăng nhập Google đầu tiên: mời đặt mật khẩu để đăng nhập được bằng email + mật khẩu. */
const SetPasswordPage = () => {
  const navigate = useNavigate();
  const [user] = useState(readStoredUser);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chưa đăng nhập thì không đặt mật khẩu được
  if (!LocalStorage.getItem('access_token')) return <Navigate to="/login" replace />;

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clientErrors = validate(password, confirm);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await AuthApi.setPassword({ password, confirmPassword: confirm });
      if (user) LocalStorage.setItem('user', JSON.stringify({ ...user, hasPassword: true }));
      Notification.success({ text: response.message || 'Password saved.' });
      navigate('/', { replace: true });
    } catch (error) {
      if (Helper.getErrorCode(error) === 'PASSWORD_ALREADY_SET') {
        if (user) LocalStorage.setItem('user', JSON.stringify({ ...user, hasPassword: true }));
        Notification.info({ text: Helper.getErrorMessage(error, 'Your account already has a password.') });
        navigate('/', { replace: true });
        return;
      }
      setErrors(Helper.getFieldErrors(error));
      Notification.error({ text: Helper.getErrorMessage(error, 'Could not save your password. Please try again.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto my-4 w-full max-w-115 p-4 md:my-8 md:p-8">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-hand text-h1">Set a password</h1>
          <p className="text-small text-ink-muted">
            You signed in with Google
            {user?.email && (
              <>
                {' '}
                as <b className="text-ink break-all">{user.email}</b>
              </>
            )}
            . Add a password so you can also sign in with your email.
          </p>
        </div>

        {/* Cho trình quản lý mật khẩu biết mật khẩu mới thuộc tài khoản nào */}
        <input type="email" name="username" autoComplete="username" value={user?.email ?? ''} readOnly hidden />

        <Field
          id="password"
          label="Password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={`${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`}
          disabled={isSubmitting}
        />
        <Field
          id="confirmPassword"
          label="Repeat password"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirmPassword}
          disabled={isSubmitting}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save password'}
        </Button>
        <ButtonLink to="/" variant="ghost" className="self-center">
          Skip for now
        </ButtonLink>
        <p className="text-ink-muted text-[13px]">
          You can keep using Google to sign in. Without a password, you can set one later with “Forgot password”.
        </p>
      </form>
    </Card>
  );
};

export default SetPasswordPage;
