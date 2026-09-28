import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CodeInput } from '@/components/ui/code-input';
import { REGISTER_PATH } from '@/constants/nav';
import useClock from '@/hooks/useClock';
import SignupStore, { type PendingSignup } from '@/lib/signup';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

const CODE_LENGTH = 6;

type Status =
  | { kind: 'idle' }
  | { kind: 'wrong'; attemptsLeft: number }
  | { kind: 'usedUp' }
  | { kind: 'signupExpired' }
  | { kind: 'duplicate' };

const secondsUntil = (deadline: number, now: number) => Math.max(0, Math.ceil((deadline - now) / 1000));
const minSec = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** FR-009 — the 6-digit code mailed at sign-up; the right code creates the account and signs in. */
const VerifyEmailPage = () => {
  const { t } = useTranslation('VerifyEmail');
  const navigate = useNavigate();
  const codeRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingSignup | null>(() => SignupStore.getPending());
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const now = useClock(1000).getTime();

  // After a wrong code, hand focus back once the boxes are enabled again (a disabled input cannot take focus)
  useEffect(() => {
    if (status.kind === 'wrong') codeRef.current?.focus();
  }, [status]);

  if (!pending) return <Navigate to={REGISTER_PATH} replace />;

  const codeLeft = secondsUntil(pending.codeExpiresAt, now);
  const resendLeft = secondsUntil(pending.resendAt, now);
  const finished = status.kind === 'signupExpired' || status.kind === 'duplicate';
  const usedUp = status.kind === 'usedUp' || codeLeft === 0;
  const locked = finished || usedUp;

  /** "Change email" keeps this tab's token, so a corrected form updates the same sign-up; a dead sign-up drops it. */
  const backToForm = (keepToken: boolean) => {
    if (!keepToken) SignupStore.clearPending();
    navigate(REGISTER_PATH);
  };

  const submit = async (value: string) => {
    if (value.length !== CODE_LENGTH || isSubmitting || locked) return;
    setIsSubmitting(true);
    try {
      const response = await AuthApi.verifySignup({ email: pending.email, code: value, signupToken: pending.token });
      Session.save(response.data);
      SignupStore.clear();
      Notification.success({ text: t('toast.created') });
      navigate('/', { replace: true });
    } catch (error) {
      setCode('');
      switch (Helper.getErrorCode(error)) {
        case 'SIGNUP_CODE_INVALID': {
          const left = Number(Helper.getFieldErrors(error).attemptsLeft ?? 0);
          setStatus(left > 0 ? { kind: 'wrong', attemptsLeft: left } : { kind: 'usedUp' });
          break;
        }
        case 'SIGNUP_CODE_EXPIRED':
          setStatus({ kind: 'usedUp' });
          break;
        case 'SIGNUP_EXPIRED':
          setStatus({ kind: 'signupExpired' });
          break;
        case 'DUPLICATE_ACCOUNT':
          setStatus({ kind: 'duplicate' });
          break;
        default:
          Notification.error({ text: Helper.getErrorMessage(error, t('toast.failed')) });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resend = async () => {
    setIsResending(true);
    try {
      const response = await AuthApi.resendSignupCode(pending.email, pending.token);
      setPending(SignupStore.savePending(response.data));
      setStatus({ kind: 'idle' });
      setCode('');
      Notification.success({ text: t('toast.resent') });
    } catch (error) {
      const errorCode = Helper.getErrorCode(error);
      if (errorCode === 'RATE_LIMITED') {
        const wait = Helper.getRetryAfterSeconds(error) ?? 60;
        const next = { ...pending, resendAt: Date.now() + wait * 1000 };
        SignupStore.setPending(next);
        setPending(next);
        Notification.warning({ text: t('toast.tooMany', { count: Math.ceil(wait / 60) }) });
      } else if (errorCode === 'SIGNUP_EXPIRED') {
        setStatus({ kind: 'signupExpired' });
      } else {
        Notification.error({ text: Helper.getErrorMessage(error, t('toast.failed')) });
      }
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(code);
  };

  return (
    <Card className="mx-auto my-8 flex w-full max-w-115 flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-hand text-h1">{t('title')}</h1>
        <p className="text-body">
          <Trans
            t={t}
            i18nKey="sentTo"
            values={{ email: pending.email }}
            components={{ b: <b className="break-all" /> }}
          />
        </p>
      </div>

      {status.kind === 'wrong' && (
        <Banner variant="danger" title={t('wrong.title')}>
          {t('wrong.text', { count: status.attemptsLeft })}
        </Banner>
      )}
      {usedUp && !finished && (
        <Banner variant="warning" title={t('usedUp.title')}>
          {t('usedUp.text')}
        </Banner>
      )}
      {status.kind === 'signupExpired' && (
        <Banner variant="warning" title={t('signupExpired.title')}>
          {t('signupExpired.text')}
        </Banner>
      )}
      {status.kind === 'duplicate' && (
        <Banner variant="danger" title={t('duplicate.title')}>
          {t('duplicate.text')}
        </Banner>
      )}

      {finished ? (
        <Button onClick={() => backToForm(false)}>{t('fillAgain')}</Button>
      ) : (
        <>
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
            <CodeInput
              ref={codeRef}
              id="signup-code"
              label={t('codeLabel')}
              value={code}
              onChange={setCode}
              onComplete={submit}
              invalid={status.kind === 'wrong'}
              disabled={isSubmitting || locked}
              describedBy="signup-code-hint"
            />
            <p id="signup-code-hint" className="text-ink-muted -mt-2 text-[13px]">
              {codeLeft === 0 ? t('expired') : t('expiresIn', { time: minSec(codeLeft) })}
            </p>
            <Button type="submit" disabled={code.length !== CODE_LENGTH || isSubmitting || locked}>
              {isSubmitting ? t('submitting') : t('submit')}
            </Button>
            {code.length !== CODE_LENGTH && !locked && (
              <p className="text-ink-muted -mt-2 text-[13px]">{t('enterAll')}</p>
            )}
          </form>

          <div className="flex flex-col gap-2">
            <p className="text-small text-ink-muted">{t('help')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" disabled={isResending || resendLeft > 0} onClick={resend} aria-live="polite">
                {isResending ? t('resending') : resendLeft > 0 ? t('resendIn', { count: resendLeft }) : t('resend')}
              </Button>
              <Button variant="ghost" onClick={() => backToForm(true)}>
                {t('changeEmail')}
              </Button>
            </div>
          </div>
        </>
      )}

      <Link to="/login" className="text-small text-brand underline">
        {t('haveAccount')}
      </Link>
    </Card>
  );
};

export default VerifyEmailPage;
