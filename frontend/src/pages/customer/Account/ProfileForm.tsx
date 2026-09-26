import { AxiosError } from 'axios';
import { useCallback, useEffect, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import AuthApi from '@/api-requests/auth.requests';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import type { UpdateProfileInput } from '@/types/auth.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';
import { validateProfile, type ProfileErrors } from '@/utils/validation';

type Status = 'loading' | 'error' | 'signed-out' | 'ready';
type FormErrors = ProfileErrors;

const EMPTY: UpdateProfileInput = { fullName: '', phone: '', address: '' };
const validate = validateProfile;

const isUnauthorized = (error: unknown) => error instanceof AxiosError && error.response?.status === 401;

/**
 * "Your details": lấy hồ sơ bằng GET /auth/me, lưu bằng PUT /auth/me. Email chỉ đọc (dùng để đăng nhập). Nằm chung
 * khung với ảnh đại diện nên không tự bọc Card.
 */
const ProfileForm = () => {
  const { t } = useTranslation('CustomerAccount');
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
      // Phiên đăng nhập từ trước khi có avatarUrl (hoặc đổi ảnh ở tab khác) → lấy bản mới nhất từ server
      Session.updateUser({ avatarUrl: user.avatarUrl });
      setForm(values);
      setSaved(values);
      setStatus('ready');
    } catch (error) {
      if (isUnauthorized(error)) {
        setStatus('signed-out');
        return;
      }
      setLoadError(Helper.getErrorMessage(error, t('profile.loadFailed')));
      setStatus('error');
    }
  }, [t]);

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
      Notification.success({ text: response.message || t('profile.saved') });
    } catch (error) {
      // 400 VALIDATION_ERROR / 409 DUPLICATE_ACCOUNT (số điện thoại đã có người dùng) → lỗi dưới ô nhập
      setErrors(Helper.getFieldErrors(error));
      Notification.error({ text: Helper.getErrorMessage(error, t('profile.saveFailed')) });
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <h2 className="text-h3">{t('profile.title')}</h2>
        <p className="text-small text-ink-muted">{t('profile.loading')}</p>
      </div>
    );
  }

  if (status === 'signed-out') {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-h3">{t('profile.title')}</h2>
        <Banner variant="warning" title={t('profile.signedOut.title')}>
          {t('profile.signedOut.text')}
        </Banner>
        <ButtonLink to="/login" className="self-start">
          {t('profile.signedOut.signIn')}
        </ButtonLink>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-h3">{t('profile.title')}</h2>
        <Banner variant="danger" title={loadError}>
          {t('profile.nothingChanged')}
        </Banner>
        <Button variant="secondary" className="self-start" onClick={load}>
          {t('profile.retry')}
        </Button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <h2 className="text-h3">{t('profile.title')}</h2>
      <div className="flex flex-col gap-4">
        <Field
          id="fullName"
          label={t('profile.fullName')}
          required
          autoComplete="name"
          value={form.fullName}
          onChange={onChange('fullName')}
          error={errors.fullName}
          disabled={isSaving}
        />
        <Field
          id="phone"
          label={t('profile.phone')}
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
          label={t('profile.email')}
          type="email"
          value={email}
          readOnly
          disabled
          hint={t('profile.emailHint')}
        />
        <Field
          id="address"
          label={t('profile.address')}
          required
          autoComplete="street-address"
          value={form.address}
          onChange={onChange('address')}
          error={errors.address}
          hint={errors.address ? undefined : t('profile.addressHint')}
          disabled={isSaving}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={isSaving || !isDirty}>
          {isSaving ? t('profile.saving') : t('profile.save')}
        </Button>
        {!isDirty && !isSaving && <span className="text-small text-ink-muted">{t('profile.noChanges')}</span>}
      </div>
    </form>
  );
};

export default ProfileForm;
