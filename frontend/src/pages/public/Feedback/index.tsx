import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import FeedbackApi, { type FeedbackType } from '@/api-requests/feedback.requests';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const TYPES: FeedbackType[] = ['bug', 'suggestion', 'query'];

const MESSAGE_MIN = 10;

const FeedbackPage = () => {
  const { t } = useTranslation('Feedback');
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const trimmed = message.trim();
    if (!trimmed || trimmed.length < MESSAGE_MIN) {
      setError(t('messageHint'));
      return;
    }
    setError(null);
    setSending(true);
    try {
      await FeedbackApi.submit({ type, message: trimmed });
      Notification.success({ title: t('sent.title'), text: t(`sent.${type}`) });
      setMessage('');
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 429) {
        Notification.error({ text: t('tooMany') });
      } else {
        Notification.error({ text: Helper.getErrorMessage(err, t('sendFailed')) });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="font-hand md:text-display text-h1">{t('title')}</h1>
        <p className="text-body-lg max-w-140">{t('intro')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card
          as="form"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="mx-auto flex w-full flex-col gap-4 p-8"
        >
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 text-[14px] font-bold">{t('typeLegend')}</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {TYPES.map((o) => (
                <label
                  key={o}
                  className={Helper.cn(
                    'has-[:focus-visible]:outline-focus flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 p-4 text-[15px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
                    type === o
                      ? 'border-brand bg-brand-tint'
                      : 'border-line-strong bg-surface-raised hover:border-ink-muted',
                  )}
                >
                  <input
                    type="radio"
                    name="type"
                    value={o}
                    checked={type === o}
                    onChange={() => setType(o)}
                    className="sr-only"
                  />
                  {t(`types.${o}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="msg" className="text-small font-bold">
              {t('messageLabel')}
              <span className="text-danger ml-0.5">*</span>
            </label>
            <textarea
              id="msg"
              required
              minLength={MESSAGE_MIN}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (error && e.target.value.trim().length >= MESSAGE_MIN) {
                  setError(null);
                }
              }}
              placeholder={t('messagePlaceholder')}
              className={Helper.cn(
                'border-line-strong bg-surface-raised text-body focus:outline-focus min-h-24 rounded-sm border-[1.5px] p-3 focus:outline-2',
                error && 'border-danger focus:outline-danger',
              )}
            />
            <div className="flex items-center justify-between text-[13px]">
              <span className={error ? 'text-danger font-medium' : 'text-ink-muted'}>{error ?? t('messageHint')}</span>
              <span
                className={Helper.cn(
                  'text-[12px] tabular-nums',
                  message.trim().length === 0
                    ? 'text-ink-muted'
                    : message.trim().length < MESSAGE_MIN
                      ? 'text-danger font-medium'
                      : 'text-brand font-medium',
                )}
              >
                {message.trim().length} / 2000
              </span>
            </div>
          </div>

          <div>
            <Button type="submit" disabled={sending}>
              {sending ? (
                <span className="inline-flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('submit')}
                </span>
              ) : (
                t('submit')
              )}
            </Button>
          </div>
        </Card>

        <aside className="flex flex-col gap-4">
          <div className="border-line-strong bg-surface-raised flex flex-col gap-2 rounded-xl border p-6 shadow-xs">
            <h2 className="text-h3">{t('notPlatform.title')}</h2>
            <p className="text-[15px]">{t('notPlatform.text')}</p>
            <Link to="/orders" className="text-brand underline">
              {t('notPlatform.cta')}
            </Link>
          </div>
          <div className="border-line-strong bg-surface-raised flex flex-col gap-2 rounded-xl border p-6 shadow-xs">
            <h2 className="text-h3">{t('after.title')}</h2>
            <p className="text-[15px]">{t('after.text')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default FeedbackPage;
