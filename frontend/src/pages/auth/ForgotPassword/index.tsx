import { useEffect, useState, type SubmitEvent } from 'react';
import { Link } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** Khớp app.password-reset.token-ttl-seconds (900s) của backend. */
const LINK_TTL_MINUTES = 15;
/** "Send it again" chỉ bấm được sau mỗi 60 giây. */
const RESEND_COOLDOWN_SECONDS = 60;
const DEFAULT_SENT_MESSAGE = 'If that email is registered, you will receive a password reset link.';

/** FR-007 — request a password reset link. */
const ForgotPasswordPage = () => {
  const [step, setStep] = useState<'ask' | 'sent'>('ask');
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Đếm ngược từng giây cho tới khi được gửi lại
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  /** Gọi API; backend trả cùng một câu dù email có tài khoản hay không. */
  const requestLink = async (address: string) => {
    setIsSubmitting(true);
    try {
      const response = await AuthApi.forgotPassword(address);
      Notification.success({ text: response.message || DEFAULT_SENT_MESSAGE });
      setSentTo(address);
      setStep('sent');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const fieldError = Helper.getFieldErrors(err).email;
      setError(fieldError);
      if (fieldError) setStep('ask');
      Notification.error({ text: Helper.getErrorMessage(err, 'Could not send the reset link. Please try again.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setError('Enter your email.');
      return;
    }
    if (!EMAIL_RE.test(value)) {
      setError('Enter an email address like name@example.com.');
      return;
    }
    setError(undefined);
    requestLink(value);
  };

  if (step === 'sent') {
    return (
      <Card className="mx-auto my-8 flex w-full max-w-115 flex-col gap-4 p-4 md:p-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-hand text-h1">Check your email</h1>
          <p className="text-body">
            If <b>{sentTo}</b> has an account, a link to choose a new password is on its way. It works once, for{' '}
            {LINK_TTL_MINUTES} minutes.
          </p>
        </div>

        <Banner title="We answer the same way whether or not the address has an account.">
          That stops anyone using this form to find out who is registered on MarketLink.
        </Banner>

        <div className="flex flex-col gap-2">
          <p className="text-small text-ink-muted">
            Nothing after a minute? Look in spam, or send it again. Sending again replaces the earlier link.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              disabled={isSubmitting || cooldown > 0}
              onClick={() => requestLink(sentTo)}
              aria-live="polite"
            >
              {isSubmitting ? 'Sending…' : cooldown > 0 ? `Send it again in ${cooldown}s` : 'Send it again'}
            </Button>
            <Button variant="ghost" disabled={isSubmitting} onClick={() => setStep('ask')}>
              Use another address
            </Button>
          </div>
        </div>

        <Link to="/login" className="text-small text-brand underline">
          Back to sign in
        </Link>
      </Card>
    );
  }

  return (
    <Card className="mx-auto my-8 flex w-full max-w-115 flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-hand text-h1">Forgot your password?</h1>
        <p className="text-small text-ink-muted">
          Enter the email you signed up with. If it matches an account, we send a link that lets you choose a new
          password.
        </p>
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
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
          disabled={isSubmitting}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <Link to="/login" className="text-small text-brand underline">
        Back to sign in
      </Link>
    </Card>
  );
};

export default ForgotPasswordPage;
