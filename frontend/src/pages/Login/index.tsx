import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/input';
import { Button, ButtonLink } from '@/components/ui/button';

/** FR-003 — shared sign-in for Customer and Farmer. Admin uses its own sign-in screen (FR-004). */
const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <Card as="form" onSubmit={onSubmit} className="mx-auto my-8 flex w-full max-w-115 flex-col gap-4 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-hand text-h1">Sign in</h1>
        <p className="text-small text-ink-muted">
          Customers and Farmers sign in here. Admins use the{' '}
          <Link to="/admin/login" className="text-brand underline">
            separate admin sign-in
          </Link>
          .
        </p>
      </div>

      <Field
        id="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field
        id="pw"
        label="Password"
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="flex items-center justify-between gap-4">
        <Link to="/forgot-password" className="text-small text-brand underline">
          Forgot password?
        </Link>
      </div>

      <Checkbox id="consent" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)}>
        I accept the{' '}
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
          Pay the Farmer at the stall on pickup. MarketLink never takes a payment.
        </small>
      </Checkbox>

      <Button type="submit" disabled={!accepted} className="w-full">
        Sign in
      </Button>

      <p className="text-ink-muted before:bg-line-strong after:bg-line-strong flex items-center gap-3 text-[13px] before:h-px before:flex-1 after:h-px after:flex-1">
        or
      </p>

      <div className="flex flex-col gap-2">
        <ButtonLink to="/register/customer" variant="secondary" className="w-full">
          Continue with Google
        </ButtonLink>
        <ButtonLink to="/register/customer" variant="secondary" className="w-full">
          Continue with Facebook
        </ButtonLink>
        <p className="text-ink-muted text-[13px]">
          Google and Facebook give us your name and email. Your phone number and address are still needed before your
          first order, so we ask for them once on the next screen.
        </p>
      </div>

      <p className="text-small text-ink-muted">
        New here?{' '}
        <Link to="/register/customer" className="text-brand underline">
          Create a customer account
        </Link>{' '}
        or{' '}
        <Link to="/register/farmer" className="text-brand underline">
          register your stall
        </Link>
        .
      </p>
    </Card>
  );
};

export default LoginPage;
