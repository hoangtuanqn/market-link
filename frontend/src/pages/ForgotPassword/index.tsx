import { useEffect, useState, type SubmitEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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

/** FR-007 — request a password reset link. */
const ForgotPasswordPage = () => {
  const { t } = useTranslation('ForgotPassword');
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
      Notification.success({ text: response.message || t('toast.sent') });
      setSentTo(address);
      setStep('sent');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const fieldError = Helper.getFieldErrors(err).email;
      setError(fieldError);
      if (fieldError) setStep('ask');
      Notification.error({ text: Helper.getErrorMessage(err, t('toast.failed')) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setError(t('errors.emailRequired'));
      return;
    }
    if (!EMAIL_RE.test(value)) {
      setError(t('errors.emailInvalid'));
      return;
    }
    setError(undefined);
    requestLink(value);
  };

  if (step === 'sent') {
    return (
      <Card className="mx-auto my-8 flex w-full max-w-115 flex-col gap-4 p-4 md:p-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-hand text-h1">{t('sent.title')}</h1>
          <p className="text-body">
            <Trans
              t={t}
              i18nKey="sent.text"
              values={{ email: sentTo }}
              count={LINK_TTL_MINUTES}
              components={{ b: <b /> }}
            />
          </p>
        </div>

        <Banner title={t('sent.bannerTitle')}>{t('sent.bannerText')}</Banner>

        <div className="flex flex-col gap-2">
          <p className="text-small text-ink-muted">{t('sent.help')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              disabled={isSubmitting || cooldown > 0}
              onClick={() => requestLink(sentTo)}
              aria-live="polite"
            >
              {isSubmitting ? t('sending') : cooldown > 0 ? t('sent.resendIn', { count: cooldown }) : t('sent.resend')}
            </Button>
            <Button variant="ghost" disabled={isSubmitting} onClick={() => setStep('ask')}>
              {t('sent.otherAddress')}
            </Button>
          </div>
        </div>

        <Link to="/login" className="text-small text-brand underline">
          {t('backToSignIn')}
        </Link>
      </Card>
    );
  }

  return (
    <Card className="mx-auto my-8 flex w-full max-w-115 flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-hand text-h1">{t('title')}</h1>
        <p className="text-small text-ink-muted">{t('intro')}</p>
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          id="email"
          label={t('email')}
          type="email"
          required
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          hint={error ? undefined : t('emailHint')}
          disabled={isSubmitting}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('sending') : t('submit')}
        </Button>
      </form>

      <Link to="/login" className="text-small text-brand underline">
        {t('backToSignIn')}
      </Link>
    </Card>
  );
};

export default ForgotPasswordPage;
