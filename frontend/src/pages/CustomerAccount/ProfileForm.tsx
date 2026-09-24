import { AxiosError } from 'axios';
import { useCallback, useEffect, useState, type ChangeEvent, type SubmitEvent } from 'react';
import AuthApi from '@/api-requests/auth.requests';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';
import type { UpdateProfileInput } from '@/types/auth.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

type Status = 'loading' | 'error' | 'signed-out' | 'ready';
type FormErrors = Partial<Record<keyof UpdateProfileInput, string>>;

/** Di động Việt Nam: 10 số, đầu 03/05/07/08/09 (RegisterRules.PHONE_REGEX của backend). */
const PHONE_REGEX = /^0[35789][0-9]{8}$/;
const EMPTY: UpdateProfileInput = { fullName: '', phone: '', address: '' };

/** Kiểm tra phía client, cùng luật với UpdateProfileRequest của backend. */
const validate = (form: UpdateProfileInput): FormErrors => {
  const errors: FormErrors = {};
  const fullName = form.fullName.trim();
  const phone = form.phone.trim();
  const address = form.address.trim();
  if (!fullName) errors.fullName = 'Enter your full name.';
  else if (fullName.length > 100) errors.fullName = 'Full name can be at most 100 characters.';
  if (!phone) errors.phone = 'Enter your phone number.';
  else if (!PHONE_REGEX.test(phone)) errors.phone = 'Enter a valid Vietnamese mobile number (10 digits).';
  if (!address) errors.address = 'Enter your address.';
  else if (address.length > 255) errors.address = 'Address can be at most 255 characters.';
  return errors;
};

const isUnauthorized = (error: unknown) => error instanceof AxiosError && error.response?.status === 401;

/** "Your details": lấy hồ sơ bằng GET /auth/me, lưu bằng PUT /auth/me. Email chỉ đọc (dùng để đăng nhập). */
const ProfileForm = () => {
  const [status, setStatus] = useState<Status>('loading');
  const [loadError, setLoadError] = useState('');
  const [email, setEmail] = useState('');
  const [form, setForm] = useState<UpdateProfileInput>(EMPTY);
  const [saved, setSaved] = useState<UpdateProfileInput>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { data: user } = await AuthApi.getMe();
      const values = { fullName: user.fullName ?? '', phone: user.phone ?? '', address: user.address ?? '' };
      setEmail(user.email);
      setForm(values);
      setSaved(values);
      setStatus('ready');
    } catch (error) {
      if (isUnauthorized(error)) {
        setStatus('signed-out');
        return;
      }
      setLoadError(Helper.getErrorMessage(error, 'Could not load your details. Please try again.'));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải hồ sơ khi mở trang
    load();
  }, [load]);

  const onChange = (key: keyof UpdateProfileInput) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const isDirty =
    form.fullName.trim() !== saved.fullName ||
    form.phone.trim() !== saved.phone ||
    form.address.trim() !== saved.address;

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clientErrors = validate(form);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSaving(true);
    try {
      const response = await AuthApi.updateMe({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      const user = response.data;
      const values = { fullName: user.fullName, phone: user.phone ?? '', address: user.address ?? '' };
      setForm(values);
      setSaved(values);
      // Header ("Hi, …") đọc từ phiên nên cập nhật luôn
      Session.updateUser(user);
      Notification.success({ text: response.message || 'Your details are saved.' });
    } catch (error) {
      // 400 VALIDATION_ERROR / 409 DUPLICATE_ACCOUNT (số điện thoại đã có người dùng) → lỗi dưới ô nhập
      setErrors(Helper.getFieldErrors(error));
      Notification.error({ text: Helper.getErrorMessage(error, 'Could not save your details. Please try again.') });
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <Card className="flex flex-col gap-2 p-6" aria-busy="true">
        <h2 className="text-h3">Your details</h2>
        <p className="text-small text-ink-muted">Loading your details…</p>
      </Card>
    );
  }

  if (status === 'signed-out') {
    return (
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-h3">Your details</h2>
        <Banner variant="warning" title="You are signed out.">
          Sign in again to see and edit your details.
        </Banner>
        <ButtonLink to="/login" className="self-start">
          Sign in
        </ButtonLink>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-h3">Your details</h2>
        <Banner variant="danger" title={loadError}>
          Nothing was changed.
        </Banner>
        <Button variant="secondary" className="self-start" onClick={load}>
          Try again
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <h2 className="text-h3">Your details</h2>
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
          <Field
            id="email"
            label="Email"
            type="email"
            value={email}
            readOnly
            disabled
            hint="Used to sign in. It cannot be changed here."
          />
          <Field
            id="address"
            label="Address"
            required
            autoComplete="street-address"
            value={form.address}
            onChange={onChange('address')}
            error={errors.address}
            hint={errors.address ? undefined : 'Used for distances and directions.'}
            disabled={isSaving}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" disabled={isSaving || !isDirty}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
          {!isDirty && !isSaving && <span className="text-small text-ink-muted">No changes to save.</span>}
        </div>
      </form>
    </Card>
  );
};

export default ProfileForm;
