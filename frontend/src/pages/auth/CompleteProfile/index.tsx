import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import AddressFields from '@/components/address/AddressFields';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';
import useLogout from '@/hooks/useLogout';
import { addressErrorsFrom, cleanAddress, validateAddress } from '@/lib/address';
import { emptyAddress, type AddressErrors, type AddressParts } from '@/types/address.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';
import { validateProfile, type ProfileErrors } from '@/utils/validation';

/**
 * After the first Google sign-in: Google only gives the name and email, so the phone number + address (FR-001) are
 * required here — cannot be skipped (MainLayout blocks every other page until complete). Saved with PUT /auth/me; then
 * moves on to setting a password if the account has none. If they do not want to fill in, the only option is to sign
 * out.
 */
const CompleteProfilePage = () => {
  const { t } = useTranslation('CompleteProfile');
  const navigate = useNavigate();
  const logout = useLogout();
  const [user] = useState(Session.getUser);
  const [form, setForm] = useState(() => ({ fullName: user?.fullName ?? '', phone: user?.phone ?? '' }));
  const [address, setAddress] = useState<AddressParts>(() => user?.addressParts ?? emptyAddress());
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // Not signed in means there is no profile to complete
  if (!Session.getAccessToken() || !user) return <Navigate to="/login" replace />;

  const onChange = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

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
      Session.updateUser(response.data);
      Notification.success({ text: response.message || t('toast.saved') });
      navigate(Helper.nextStepAfterSocialLogin({ ...user, ...response.data }), { replace: true });
    } catch (error) {
      // 400 VALIDATION_ERROR / 409 DUPLICATE_ACCOUNT (the phone number already belongs to another account) → error under the input
      const fieldErrors = Helper.getFieldErrors(error);
      setErrors(fieldErrors);
      setAddressErrors(addressErrorsFrom(fieldErrors));
      Notification.error({ text: Helper.getErrorMessage(error, t('toast.failed')) });
      setIsSaving(false);
    }
  };

  return (
    <Card className="mx-auto my-4 w-full max-w-160 p-4 md:my-8 md:p-8">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-hand text-h1">{t('title')}</h1>
          <p className="text-small text-ink-muted">
            <Trans
              t={t}
              i18nKey="intro"
              values={{ email: user.email }}
              components={{ b: <b className="text-ink break-all" /> }}
            />
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            id="fullName"
            label={t('fields.fullName')}
            required
            autoComplete="name"
            value={form.fullName}
            onChange={onChange('fullName')}
            error={errors.fullName}
            disabled={isSaving}
          />
          <Field
            id="phone"
            label={t('fields.phone')}
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
        </div>

        <AddressFields
          idPrefix="address"
          value={address}
          onChange={setAddress}
          errors={addressErrors}
          disabled={isSaving}
        />

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? t('saving') : t('submit')}
          </Button>
          <Button variant="ghost" onClick={logout} disabled={isSaving}>
            {t('signOut')}
          </Button>
        </div>
        <p className="text-ink-muted text-[13px]">{t('note')}</p>
      </form>
    </Card>
  );
};

export default CompleteProfilePage;
