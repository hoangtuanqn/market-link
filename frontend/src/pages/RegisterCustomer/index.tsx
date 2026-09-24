import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/** FR-001 — Customer registration. */
const RegisterCustomerPage = () => {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <Card as="form" onSubmit={onSubmit} className="mx-auto my-8 flex w-full max-w-160 flex-col gap-4 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-hand text-h1">Create a customer account</h1>
        <p className="text-small text-ink-muted">
          Name, phone number, email and address are required by the platform. The address is used to show distances to
          markets and to pre-fill directions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field id="name" label="Full name" required autoComplete="name" placeholder="Nguyễn Minh Khang" />
        <Field id="phone" label="Phone number" required inputMode="tel" autoComplete="tel" pattern="[0-9]{10}" />
        <Field
          id="email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          hint="Used to sign in and for order notifications."
        />
        <Field
          id="address"
          label="Address"
          required
          autoComplete="street-address"
          placeholder="Street, ward, district"
        />
        <Field
          id="pw"
          label="Password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          hint="At least 8 characters."
        />
        <Field id="pw2" label="Repeat password" type="password" required autoComplete="new-password" />
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
          Your name and phone number go to the stall you order from, so they can hand your order over on market day. You
          pay the Farmer at the stall.
        </small>
      </Checkbox>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button type="submit" disabled={!accepted}>
          Create account
        </Button>
        <Link to="/login" className="text-small text-brand underline">
          I already have an account
        </Link>
      </div>

      <p className="text-ink-muted text-[13px]">
        One account can be shared within a family; the system does not tell people apart inside an account.
      </p>
    </Card>
  );
};

export default RegisterCustomerPage;
