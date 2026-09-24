import { useState, type ChangeEvent, type FormEvent } from 'react';
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
/** Di động Việt Nam: 10 số, đầu 03/05/07/08/09 (RegisterRules.PHONE_REGEX của backend). */
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

/** Kiểm tra phía client, cùng luật với CustomerRegisterRequest của backend. */
const validate = (form: RegisterInput): FormErrors => {
  const errors: FormErrors = {};
  const fullName = form.fullName.trim();
  const email = form.email.trim();
  const address = form.address.trim();

  if (!fullName) errors.fullName = 'Enter your full name.';
  else if (fullName.length > 100) errors.fullName = 'Full name can be at most 100 characters.';

  if (!form.phone.trim()) errors.phone = 'Enter your phone number.';
  else if (!PHONE_REGEX.test(form.phone.trim())) errors.phone = 'Enter a valid Vietnamese mobile number (10 digits).';

  if (!email) errors.email = 'Enter your email.';
  else if (!EMAIL_REGEX.test(email)) errors.email = 'Enter a valid email address.';
  else if (email.length > 100) errors.email = 'Email can be at most 100 characters.';

  if (!address) errors.address = 'Enter your address.';
  else if (address.length > 255) errors.address = 'Address can be at most 255 characters.';

  if (!form.password) errors.password = 'Enter your password.';
  else if (form.password.length < PASSWORD_MIN || form.password.length > PASSWORD_MAX)
    errors.password = `Password must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`;

  if (!form.confirmPassword) errors.confirmPassword = 'Confirm your password.';
  else if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match.';

  return errors;
};

/** FR-001 — Customer registration. */
const RegisterCustomerPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (key: keyof RegisterInput) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const clientErrors = validate(form);
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

      // Backend đăng nhập luôn sau khi đăng ký (refresh token nằm trong cookie HttpOnly)
      Session.save(response.data);

      Notification.success({ text: response.message || 'Account created.' });
      navigate('/');
    } catch (error) {
      // 400 VALIDATION_ERROR / 409 DUPLICATE_ACCOUNT: lỗi theo field (email, phone, confirmPassword…) hiện dưới ô nhập
      setErrors(Helper.getFieldErrors(error));
      Notification.error({
        text: Helper.getErrorMessage(error, 'Could not create your account. Please try again.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto my-8 w-full max-w-160 p-4 md:p-8">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-hand text-h1">Create a customer account</h1>
          <p className="text-small text-ink-muted">
            Name, phone number, email and address are required by the platform. The address is used to show distances to
            markets and to pre-fill directions.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            id="fullName"
            label="Full name"
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
            label="Phone number"
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
            label="Email"
            type="email"
            required
            autoComplete="email"
            hint="Used to sign in and for order notifications."
            value={form.email}
            onChange={onChange('email')}
            error={errors.email}
            disabled={isSubmitting}
          />
          <Field
            id="address"
            label="Address"
            required
            autoComplete="street-address"
            placeholder="Street, ward, district"
            value={form.address}
            onChange={onChange('address')}
            error={errors.address}
            disabled={isSubmitting}
          />
          <Field
            id="password"
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            hint={`${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`}
            value={form.password}
            onChange={onChange('password')}
            error={errors.password}
            disabled={isSubmitting}
          />
          <Field
            id="confirmPassword"
            label="Repeat password"
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
          I have read and accept the{' '}
          <Link to="/terms" className="text-brand underline">
            Terms of service
          </Link>{' '}
          and the{' '}
          <Link to="/privacy" className="text-brand underline">
            Privacy policy
          </Link>
          <span aria-hidden="true" className="text-danger ml-0.5">
            *
          </span>
          <small className="text-ink-muted mt-0.5 block text-[13px]">
            Your name and phone number go to the stall you order from, so they can hand your order over on market day.
            You pay the Farmer at the stall.
          </small>
        </Checkbox>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="submit" disabled={!accepted || isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
          <Link to="/login" className="text-small text-brand underline">
            I already have an account
          </Link>
        </div>
        {!accepted && <p className="text-ink-muted -mt-2 text-[13px]">Accept the terms to create your account.</p>}

        <p className="text-ink-muted text-[13px]">
          One account can be shared within a family; the system does not tell people apart inside an account.
        </p>
      </form>
    </Card>
  );
};

export default RegisterCustomerPage;
