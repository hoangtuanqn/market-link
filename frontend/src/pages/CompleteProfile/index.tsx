import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';
import useLogout from '@/hooks/useLogout';
import type { UpdateProfileInput } from '@/types/auth.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';
import { validateProfile, type ProfileErrors } from '@/utils/validation';

/**
 * Sau lần đăng nhập Google đầu tiên: Google chỉ cho tên và email, còn số điện thoại + địa chỉ (FR-001) bắt buộc nhập ở
 * đây — không bỏ qua được (MainLayout chặn mọi trang khác tới khi đủ). Lưu bằng PUT /auth/me; xong chuyển sang đặt mật
 * khẩu nếu tài khoản chưa có. Không muốn nhập thì chỉ có thể đăng xuất.
 */
const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const logout = useLogout();
  const [user] = useState(Session.getUser);
  const [form, setForm] = useState<UpdateProfileInput>(() => ({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    address: user?.address ?? '',
  }));
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // Chưa đăng nhập thì không có hồ sơ để bổ sung
  if (!Session.getAccessToken() || !user) return <Navigate to="/login" replace />;

  const onChange = (key: keyof UpdateProfileInput) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clientErrors = validateProfile(form);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSaving(true);
    try {
      const response = await AuthApi.updateMe({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      Session.updateUser(response.data);
      Notification.success({ text: response.message || 'Your details are saved.' });
      navigate(Helper.nextStepAfterSocialLogin({ ...user, ...response.data }), { replace: true });
    } catch (error) {
      // 400 VALIDATION_ERROR / 409 DUPLICATE_ACCOUNT (số điện thoại đã thuộc tài khoản khác) → lỗi dưới ô nhập
      setErrors(Helper.getFieldErrors(error));
      Notification.error({ text: Helper.getErrorMessage(error, 'Could not save your details. Please try again.') });
      setIsSaving(false);
    }
  };

  return (
    <Card className="mx-auto my-4 w-full max-w-160 p-4 md:my-8 md:p-8">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-hand text-h1">Complete your profile</h1>
          <p className="text-small text-ink-muted">
            You signed in with Google as <b className="text-ink break-all">{user.email}</b>. Google gives us your name
            and email only, so we ask once for your phone number and address. The stall you order from uses them to hand
            your order over on market day.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            id="fullName"
            label="Full name"
            required
            autoComplete="name"
            value={form.fullName}
            onChange={onChange('fullName')}
            error={errors.fullName}
            disabled={isSaving}
          />
          <Field
            id="phone"
            label="Phone number"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0903118218"
            value={form.phone}
            onChange={onChange('phone')}
            error={errors.phone}
            disabled={isSaving}
          />
          <div className="md:col-span-2">
            <Field
              id="address"
              label="Address"
              required
              autoComplete="street-address"
              placeholder="Street, ward, district"
              value={form.address}
              onChange={onChange('address')}
              error={errors.address}
              hint={errors.address ? undefined : 'Used for distances and directions.'}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save and continue'}
          </Button>
          <Button variant="ghost" onClick={logout} disabled={isSaving}>
            Sign out
          </Button>
        </div>
        <p className="text-ink-muted text-[13px]">
          All three fields are required to use MarketLink. If you do not want to add them now, sign out.
        </p>
      </form>
    </Card>
  );
};

export default CompleteProfilePage;
