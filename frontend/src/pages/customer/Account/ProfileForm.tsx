import { AxiosError } from 'axios';
import { useCallback, useEffect, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import AuthApi from '@/api-requests/auth.requests';
import AddressFields from '@/components/address/AddressFields';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { addressErrorsFrom, cleanAddress, sameAddress, validateAddress } from '@/lib/address';
import { emptyAddress, type AddressErrors, type AddressParts } from '@/types/address.types';
import type { UserType } from '@/types/user.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';
import { validateProfile, type ProfileErrors } from '@/utils/validation';

type Status = 'loading' | 'error' | 'signed-out' | 'ready';
type Details = { fullName: string; phone: string };
type Saved = Details & { addressParts?: AddressParts };

const EMPTY: Details = { fullName: '', phone: '' };

const savedFrom = (user: UserType): Saved => ({
  fullName: user.fullName ?? '',
  phone: user.phone ?? '',
  addressParts: user.addressParts,
});

const isUnauthorized = (error: unknown) => error instanceof AxiosError && error.response?.status === 401;

const ProfileForm = () => {
  const { t } = useTranslation('CustomerAccount');
  const [status, setStatus] = useState<Status>('loading');
  const [loadError, setLoadError] = useState('');
  const [email, setEmail] = useState('');
  const [form, setForm] = useState<Details>(EMPTY);
  const [address, setAddress] = useState<AddressParts>(emptyAddress);
  const [saved, setSaved] = useState<Saved>(EMPTY);
  const [legacyAddress, setLegacyAddress] = useState<string>();
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { data: user } = await AuthApi.getMe();
      const values = savedFrom(user);
      setEmail(user.email);
      Session.updateUser({ avatarUrl: user.avatarUrl });
      setForm({ fullName: values.fullName, phone: values.phone });
      setAddress(values.addressParts ?? emptyAddress());
      setLegacyAddress(values.addressParts ? undefined : user.address || undefined);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the profile when the page opens
    load();
  }, [load]);

  const onChange = (key: keyof Details) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const isDirty =
    form.fullName.trim() !== saved.fullName ||
    form.phone.trim() !== saved.phone ||
    !sameAddress(address, saved.addressParts ?? emptyAddress());

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clientErrors = validateProfile(form);
    const clientAddressErrors = validateAddress(address);
    setErrors(clientErrors);
    setAddressErrors(clientAddressErrors);
    if (Object.keys(clientErrors).length > 0 || Object.keys(clientAddressErrors).length > 0) return;

    setIsSaving(true);
    try {
      const response = await AuthApi.updateMe({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        addressParts: cleanAddress(address),
      });
      const user = response.data;
      const values = savedFrom(user);
      setForm({ fullName: values.fullName, phone: values.phone });
      setAddress(values.addressParts ?? emptyAddress());
      setLegacyAddress(undefined);
      setSaved(values);
      Session.updateUser(user);
      Notification.success({ text: response.message || t('profile.saved') });
    } catch (error) {
      const fieldErrors = Helper.getFieldErrors(error);
      setErrors(fieldErrors);
      setAddressErrors(addressErrorsFrom(fieldErrors));
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
        <AddressFields
          idPrefix="profile-address"
          value={address}
          onChange={setAddress}
          errors={addressErrors}
          legacyAddress={legacyAddress}
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
