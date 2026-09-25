import { useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

type FormErrors = Partial<Record<'currentPassword' | 'newPassword' | 'confirmPassword', string>>;

/** Cùng luật mật khẩu với đăng ký / đặt lại mật khẩu (RegisterRules của backend). */
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

const validate = (current: string, next: string, confirm: string): FormErrors => {
  const errors: FormErrors = {};
  if (!current) errors.currentPassword = 'Enter your current password.';
  if (!next) errors.newPassword = 'Enter a new password.';
  else if (next.length < PASSWORD_MIN || next.length > PASSWORD_MAX)
    errors.newPassword = `Password must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`;
  else if (current && next === current) errors.newPassword = 'Use a password different from the current one.';
  if (!confirm) errors.confirmPassword = 'Confirm your password.';
  else if (confirm !== next) errors.confirmPassword = 'Passwords do not match.';
  return errors;
};

/**
 * "Change password" trên trang Account. Đổi xong backend đăng xuất mọi thiết bị (kể cả thiết bị này), nên FE xoá phiên
 * và đưa về trang đăng nhập.
 */
const ChangePasswordForm = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clientErrors = validate(currentPassword, newPassword, confirmPassword);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await AuthApi.changePassword({ currentPassword, newPassword, confirmPassword });
      Session.clear();
      Notification.success({ text: response.message || 'Your password has been changed. Please sign in again.' });
      navigate('/login', { replace: true });
    } catch (error) {
      // 400: mật khẩu hiện tại sai / mật khẩu mới không hợp lệ → lỗi dưới ô nhập
      setErrors(Helper.getFieldErrors(error));
      Notification.error({ text: Helper.getErrorMessage(error, 'Could not change your password. Please try again.') });
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3">Change password</h2>
          <p className="text-small text-ink-muted">
            You will be signed out on every device and asked to sign in again.
          </p>
        </div>

        {/* Cho trình quản lý mật khẩu biết mật khẩu thuộc tài khoản nào */}
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
          label="Current password"
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
            label="New password"
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
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
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            disabled={isSubmitting}
          />
        </div>
        <div className="pt-2">
          <Button type="submit" variant="secondary" disabled={isSubmitting}>
            {isSubmitting ? 'Changing password…' : 'Change password'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ChangePasswordForm;
