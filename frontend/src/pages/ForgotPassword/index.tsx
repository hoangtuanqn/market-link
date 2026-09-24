import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** FR-007 — request a password reset link. */
const ForgotPasswordPage = () => {
  const [step, setStep] = useState<'ask' | 'sent'>('ask');
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState<string>();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError('Enter an email address like name@example.com.');
      return;
    }
    setError(undefined);
    setSentTo(value);
    setStep('sent');
  };

  if (step === 'sent') {
    return (
      <Card className="mx-auto my-8 flex w-full max-w-115 flex-col gap-4 p-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-hand text-h1">Check your email</h1>
          <p className="text-body">
            If <b>{sentTo}</b> has an account, a link to choose a new password is on its way. It works for 30 minutes.
          </p>
        </div>

        <Banner title="We answer the same way whether or not the address has an account.">
          That stops anyone using this form to find out who is registered on MarketLink.
        </Banner>

        <div className="flex flex-col gap-2">
          <p className="text-small text-ink-muted">Nothing after a minute? Look in spam, or send it again.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary">Send it again</Button>
            <Button variant="ghost" onClick={() => setStep('ask')}>
              Use another address
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto my-8 flex w-full max-w-115 flex-col gap-4 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-hand text-h1">Forgot your password?</h1>
        <p className="text-small text-ink-muted">
          Enter the email you signed up with. If it matches an account, we send a link that lets you choose a new
          password.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          id="email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          hint={error ? undefined : 'The same address you use to sign in.'}
        />
        <Button type="submit" className="w-full">
          Send reset link
        </Button>
      </form>

      <Link to="/login" className="text-small text-brand underline">
        Back to sign in
      </Link>
    </Card>
  );
};

export default ForgotPasswordPage;
