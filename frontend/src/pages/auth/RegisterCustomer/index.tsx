import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Link, useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/input';
import type { RegisterInput } from '@/types/auth.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

type FormErrors = Partial<Record<keyof RegisterInput, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Vietnamese mobile: 10 digits, starting with 03/05/07/08/09 (the backend's RegisterRules.PHONE_REGEX). */
const PHONE_REGEX = /^0[35789][0-9]{8}$/;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

const EMPTY_FORM: RegisterInput = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  password: '',
  confirmPassword: '',
};

/** Client-side validation, same rules as the backend's CustomerRegisterRequest. */
const validate = (form: RegisterInput, t: TFunction<'RegisterCustomer'>): FormErrors => {
  const errors: FormErrors = {};
  const fullName = form.fullName.trim();
  const email = form.email.trim();
  const address = form.address.trim();

  if (!fullName) errors.fullName = t('errors.fullNameRequired');
  else if (fullName.length > 100) errors.fullName = t('errors.fullNameMax', { max: 100 });

  if (!form.phone.trim()) errors.phone = t('errors.phoneRequired');
  else if (!PHONE_REGEX.test(form.phone.trim())) errors.phone = t('errors.phoneInvalid');

  if (!email) errors.email = t('errors.emailRequired');
  else if (!EMAIL_REGEX.test(email)) errors.email = t('errors.emailInvalid');
  else if (email.length > 100) errors.email = t('errors.emailMax', { max: 100 });

  if (!address) errors.address = t('errors.addressRequired');
  else if (address.length > 255) errors.address = t('errors.addressMax', { max: 255 });

  if (!form.password) errors.password = t('errors.passwordRequired');
  else if (form.password.length < PASSWORD_MIN || form.password.length > PASSWORD_MAX)
    errors.password = t('errors.passwordLength', { min: PASSWORD_MIN, max: PASSWORD_MAX });

  if (!form.confirmPassword) errors.confirmPassword = t('errors.confirmRequired');
  else if (form.confirmPassword !== form.password) errors.confirmPassword = t('errors.confirmMismatch');

  return errors;
};

/** FR-001 — Customer registration. */
const RegisterCustomerPage = () => {
  const { t } = useTranslation('RegisterCustomer');
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (key: keyof RegisterInput) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const clientErrors = validate(form, t);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await AuthApi.register({
        ...form,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
      });

      // The backend signs in right after sign-up (the refresh token lives in an HttpOnly cookie)
      Session.save(response.data);

      Notification.success({ text: response.message || t('toast.created') });
      navigate('/');
    } catch (error) {
      // 400 VALIDATION_ERROR / 409 DUPLICATE_ACCOUNT: per-field errors (email, phone, confirmPassword…) shown under the input
      setErrors(Helper.getFieldErrors(error));
      Notification.error({
        text: Helper.getErrorMessage(error, t('toast.failed')),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto my-8 w-full max-w-160 p-4 md:p-8">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-hand text-h1">{t('title')}</h1>
          <p className="text-small text-ink-muted">{t('intro')}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            id="fullName"
            label={t('fields.fullName')}
            required
            autoComplete="name"
            placeholder="Nguyen Minh Khang"
            value={form.fullName}
            onChange={onChange('fullName')}
            error={errors.fullName}
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
          <Field
            id="email"
            label={t('fields.email')}
            type="email"
            required
            autoComplete="email"
            hint={t('fields.emailHint')}
            value={form.email}
            onChange={onChange('email')}
            error={errors.email}
            disabled={isSubmitting}
          />
          <Field
            id="address"
            label={t('fields.address')}
            required
            autoComplete="street-address"
            placeholder={t('fields.addressPlaceholder')}
            value={form.address}
            onChange={onChange('address')}
            error={errors.address}
            disabled={isSubmitting}
          />
          <Field
            id="password"
            label={t('fields.password')}
            type="password"
            required
            autoComplete="new-password"
            hint={t('fields.passwordHint', { min: PASSWORD_MIN, max: PASSWORD_MAX })}
            value={form.password}
            onChange={onChange('password')}
            error={errors.password}
            disabled={isSubmitting}
          />
          <Field
            id="confirmPassword"
            label={t('fields.confirmPassword')}
            type="password"
            required
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={onChange('confirmPassword')}
            error={errors.confirmPassword}
            disabled={isSubmitting}
          />
        </div>

        <Checkbox id="consent" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)}>
          <Trans
            t={t}
            i18nKey="consent.label"
            components={{
              terms: <Link to="/terms" className="text-brand underline" />,
              privacy: <Link to="/privacy" className="text-brand underline" />,
            }}
          />
          <span aria-hidden="true" className="text-danger ml-0.5">
            *
          </span>
          <small className="text-ink-muted mt-0.5 block text-[13px]">{t('consent.note')}</small>
        </Checkbox>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="submit" disabled={!accepted || isSubmitting}>
            {isSubmitting ? t('submitting') : t('submit')}
          </Button>
          <Link to="/login" className="text-small text-brand underline">
            {t('haveAccount')}
          </Link>
        </div>
        {!accepted && <p className="text-ink-muted -mt-2 text-[13px]">{t('acceptFirst')}</p>}

        <p className="text-ink-muted text-[13px]">{t('sharedAccount')}</p>
      </form>
    </Card>
  );
};

export default RegisterCustomerPage;
