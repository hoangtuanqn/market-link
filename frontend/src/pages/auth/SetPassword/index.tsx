import { useState, type SubmitEvent } from 'react';
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
const validate = (password: string, confirm: string): FormErrors => {
  const errors: FormErrors = {};
  if (!password) errors.password = 'Enter a password.';
  else if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    errors.password = `Password must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`;
  if (!confirm) errors.confirmPassword = 'Confirm your password.';
  else if (confirm !== password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
};

/** Sau lần đăng nhập Google đầu tiên: mời đặt mật khẩu để đăng nhập được bằng email + mật khẩu. */
const SetPasswordPage = () => {
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
    const clientErrors = validate(password, confirm);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await AuthApi.setPassword({ password, confirmPassword: confirm });
      Session.updateUser({ hasPassword: true });
      Notification.success({ text: response.message || 'Password saved.' });
      navigate('/', { replace: true });
    } catch (error) {
      if (Helper.getErrorCode(error) === 'PASSWORD_ALREADY_SET') {
        Session.updateUser({ hasPassword: true });
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
