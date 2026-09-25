import type { TFunction } from 'i18next';
import { useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
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

const validate = (t: TFunction<'CustomerAccount'>, current: string, next: string, confirm: string): FormErrors => {
  const errors: FormErrors = {};
  if (!current) errors.currentPassword = t('password.errors.currentRequired');
  if (!next) errors.newPassword = t('password.errors.newRequired');
  else if (next.length < PASSWORD_MIN || next.length > PASSWORD_MAX)
    errors.newPassword = t('password.errors.length', { min: PASSWORD_MIN, max: PASSWORD_MAX });
  else if (current && next === current) errors.newPassword = t('password.errors.same');
  if (!confirm) errors.confirmPassword = t('password.errors.confirmRequired');
  else if (confirm !== next) errors.confirmPassword = t('password.errors.mismatch');
  return errors;
};

/**
 * "Change password" trên trang Account. Đổi xong backend đăng xuất mọi thiết bị (kể cả thiết bị này), nên FE xoá phiên
 * và đưa về trang đăng nhập.
 */
const ChangePasswordForm = () => {
  const { t } = useTranslation('CustomerAccount');
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clientErrors = validate(t, currentPassword, newPassword, confirmPassword);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await AuthApi.changePassword({ currentPassword, newPassword, confirmPassword });
      Session.clear();
      Notification.success({ text: response.message || t('password.changed') });
      navigate('/login', { replace: true });
    } catch (error) {
      // 400: mật khẩu hiện tại sai / mật khẩu mới không hợp lệ → lỗi dưới ô nhập
      setErrors(Helper.getFieldErrors(error));
      Notification.error({ text: Helper.getErrorMessage(error, t('password.failed')) });
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3">{t('password.title')}</h2>
          <p className="text-small text-ink-muted">{t('password.intro')}</p>
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
          label={t('password.current')}
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
            label={t('password.new')}
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
            hint={t('password.hint', { min: PASSWORD_MIN, max: PASSWORD_MAX })}
            disabled={isSubmitting}
          />
          <Field
            id="confirmPassword"
            label={t('password.repeat')}
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
            {isSubmitting ? t('password.submitting') : t('password.submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ChangePasswordForm;
