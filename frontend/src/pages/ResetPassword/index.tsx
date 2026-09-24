import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Field } from '@/components/ui/input';

/** FR-007 — set a new password from the emailed link (step 2 of 2). */
const ResetPasswordPage = () => {
  const [expiredPreview, setExpiredPreview] = useState(false);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();

  const toggleExpiredPreview = () => {
    setExpiredPreview((v) => !v);
    setDone(false);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords are different. Type the same one twice.');
      return;
    }
    setError(undefined);
    setDone(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-115 flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-small text-ink-muted">Step 2 of 2</span>
        <Chip pressed={expiredPreview} onClick={toggleExpiredPreview}>
          Preview: expired link
        </Chip>
      </div>

      {expiredPreview ? (
        <Card className="mt-2 flex flex-col gap-4 p-8">
          <h1 className="font-hand text-h1">This link has expired</h1>
          <Banner variant="danger" title="The link was opened after it ran out.">
            Nothing has changed on the account, and the old password still works.
          </Banner>
          <p className="text-small text-ink-muted">
            Reset links work for 30 minutes and only once. Ask for a new one and use it straight away.
          </p>
          <ButtonLink to="/forgot-password" className="w-full">
            Ask for a new link
          </ButtonLink>
          <Link to="/login" className="text-small text-brand underline">
            Back to sign in
          </Link>
        </Card>
      ) : done ? (
        <Card className="mt-2 flex flex-col gap-4 p-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-hand text-h1">Password changed</h1>
            <p className="text-body">Sign in with your new password. Other devices were signed out.</p>
          </div>
          <ButtonLink to="/login" className="w-full">
            Go to sign in
          </ButtonLink>
        </Card>
      ) : (
        <Card as="form" onSubmit={onSubmit} className="mt-2 flex flex-col gap-4 p-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-hand text-h1">Choose a new password</h1>
            <p className="text-small text-ink-muted">
              You are setting a new password for <b>khang@example.com</b>. The link you opened works once.
            </p>
          </div>

          <Field
            id="np"
            label="New password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={error ? undefined : 'At least 8 characters.'}
          />
          <Field
            id="np2"
            label="Repeat new password"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={error}
          />

          <Button type="submit" className="w-full">
            Save new password
          </Button>
          <p className="text-ink-muted text-[13px]">
            Saving signs you out everywhere else, so anyone using the old password is locked out.
          </p>
        </Card>
      )}
    </div>
  );
};

export default ResetPasswordPage;
