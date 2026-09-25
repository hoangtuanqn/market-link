import { useCallback, useEffect, useState, type SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

type Status = 'checking' | 'invalid' | 'unreachable' | 'ready' | 'done';
type FormErrors = Partial<Record<'newPassword' | 'confirmPassword', string>>;

const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;
const INVALID_LINK_MESSAGE = 'This link is invalid or has expired.';

/** Kiểm tra phía client, cùng luật với ResetPasswordRequest của backend. */
const validate = (password: string, confirm: string): FormErrors => {
  const errors: FormErrors = {};
  if (!password) errors.newPassword = 'Enter a new password.';
  else if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    errors.newPassword = `Password must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`;
  if (!confirm) errors.confirmPassword = 'Confirm your password.';
  else if (confirm !== password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
};

/** FR-007 — set a new password from the emailed link (step 2 of 2). The form only shows once the link is verified. */
const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<Status>(token ? 'checking' : 'invalid');
  const [invalidMessage, setInvalidMessage] = useState(INVALID_LINK_MESSAGE);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Hỏi backend link còn dùng được không (chỉ đọc token, không làm mất nó) và lấy email của tài khoản. */
  const verify = useCallback(async () => {
    if (!token) return;
    setStatus('checking');
    try {
      const response = await AuthApi.verifyResetToken(token);
      setEmail(response.data.email);
      setStatus('ready');
    } catch (error) {
      if (Helper.getErrorCode(error) === undefined && Helper.getFieldErrors(error).token === undefined) {
        // Không có response từ backend (mất mạng, server tắt): chưa kết luận link sai
        setStatus('unreachable');
        return;
      }
      setInvalidMessage(Helper.getErrorMessage(error, INVALID_LINK_MESSAGE));
      setStatus('invalid');
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gọi API khi mở trang, setState nằm sau await
    verify();
  }, [verify]);

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clientErrors = validate(password, confirm);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await AuthApi.resetPassword({ token, newPassword: password, confirmPassword: confirm });
      // Backend đã huỷ mọi phiên đăng nhập của tài khoản, xoá luôn phiên đang lưu ở trình duyệt này
      Session.clear();
      Notification.success({ text: response.message || 'Your password has been reset. Please sign in again.' });
      setStatus('done');
    } catch (error) {
      if (Helper.getErrorCode(error) === 'INVALID_RESET_TOKEN') {
        setInvalidMessage(Helper.getErrorMessage(error, INVALID_LINK_MESSAGE));
        setStatus('invalid');
        return;
      }
      setErrors(Helper.getFieldErrors(error));
      Notification.error({
        text: Helper.getErrorMessage(error, 'Could not save your new password. Please try again.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto my-4 flex w-full max-w-115 flex-col gap-2 md:my-8">
      {/* Không gửi URL chứa token cho trang khác qua header Referer */}
      <meta name="referrer" content="no-referrer" />
      <span className="text-small text-ink-muted">Step 2 of 2</span>

      {status === 'checking' && (
        <Card className="mt-2 flex flex-col gap-4 p-4 md:p-8" aria-busy="true">
          <h1 className="font-hand text-h1">Checking your link…</h1>
          <p className="text-small text-ink-muted">This takes a second.</p>
        </Card>
      )}

      {status === 'unreachable' && (
        <Card className="mt-2 flex flex-col gap-4 p-4 md:p-8">
          <h1 className="font-hand text-h1">We could not check your link</h1>
          <Banner variant="warning" title="The server did not answer.">
            Your link has not been used. Check your connection and try again.
          </Banner>
          <Button className="w-full" onClick={verify}>
            Try again
          </Button>
        </Card>
      )}

      {status === 'invalid' && (
        <Card className="mt-2 flex flex-col gap-4 p-4 md:p-8">
          <h1 className="font-hand text-h1">This link cannot be used</h1>
          <Banner variant="danger" title={invalidMessage}>
            Nothing has changed on the account, and the old password still works.
          </Banner>
          <p className="text-small text-ink-muted">
            Reset links work for 15 minutes and only once, and asking for a new one cancels the old one. Ask for a new
            link and use it straight away.
          </p>
          <ButtonLink to="/forgot-password" className="w-full">
            Ask for a new link
          </ButtonLink>
          <Link to="/login" className="text-small text-brand underline">
            Back to sign in
          </Link>
        </Card>
      )}

      {status === 'done' && (
        <Card className="mt-2 flex flex-col gap-4 p-4 md:p-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-hand text-h1">Password changed</h1>
            <p className="text-body">
              Sign in to <b>{email}</b> with your new password. Every other device was signed out.
            </p>
          </div>
          <ButtonLink to="/login" className="w-full">
            Go to sign in
          </ButtonLink>
        </Card>
      )}

      {status === 'ready' && (
        <Card className="mt-2 p-4 md:p-8">
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="font-hand text-h1">Choose a new password</h1>
              <p className="text-small text-ink-muted">
                You are setting a new password for <b className="text-ink break-all">{email}</b>. The link you opened
                works once.
              </p>
            </div>

            {/* Cho trình quản lý mật khẩu biết mật khẩu mới thuộc tài khoản nào */}
            <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

            <Field
              id="newPassword"
              label="New password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.newPassword}
              hint={`${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`}
              disabled={isSubmitting}
            />
            <Field
              id="confirmPassword"
              label="Repeat new password"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors.confirmPassword}
              disabled={isSubmitting}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save new password'}
            </Button>
            <p className="text-ink-muted text-[13px]">
              Saving signs you out everywhere else, so anyone using the old password is locked out.
            </p>
          </form>
        </Card>
      )}
    </div>
  );
};

export default ResetPasswordPage;
