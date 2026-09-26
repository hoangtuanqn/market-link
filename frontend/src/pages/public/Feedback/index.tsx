import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, SelectField } from '@/components/ui/input';
import useSession from '@/hooks/useSession';
import Notification from '@/utils/notification';

/** Keys under `types.` and `sent.` in Feedback.json. */
const TYPES = ['bug', 'suggestion', 'query'] as const;
type FeedbackType = (typeof TYPES)[number];

/** Keys under `pages.` in Feedback.json; the value stored on the report stays the key. */
const PAGES = ['cart', 'product', 'map', 'orders', 'farmer', 'other'] as const;

/** FR-081 — bugs, suggestions and questions for the platform team, routed by type. */
const FeedbackPage = () => {
  const { t } = useTranslation('Feedback');
  const { user } = useSession();
  const [type, setType] = useState<FeedbackType>('bug');
  const [page, setPage] = useState<string>('cart');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');

  const send = () => {
    if (!message.trim()) return;
    Notification.success({ title: t('sent.title'), text: t(`sent.${type}`) });
    setMessage('');
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card
        as="form"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mx-auto flex w-full max-w-160 flex-col gap-4 p-8"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-small text-ink-muted">{t('intro')}</p>
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-[14px] font-bold">{t('typeLegend')}</legend>
          {TYPES.map((o) => (
            <label key={o} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[15px]">
              <input
                type="radio"
                name="type"
                value={o}
                checked={type === o}
                onChange={() => setType(o)}
                className="accent-brand size-5"
              />
              {t(`types.${o}`)}
            </label>
          ))}
        </fieldset>

        <SelectField
          id="page"
          label={t('pageLabel')}
          value={page}
          onChange={(e) => setPage(e.target.value)}
          options={PAGES.map((p) => ({ value: p, label: t(`pages.${p}`) }))}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="msg" className="text-small font-bold">
            {t('messageLabel')}
            <span className="text-danger ml-0.5">*</span>
          </label>
          <textarea
            id="msg"
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('messagePlaceholder')}
            className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
          />
          <span className="text-ink-muted text-[13px]">{t('messageHint')}</span>
        </div>

        <Field
          id="email"
          label={t('emailLabel')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint={t('emailHint')}
        />

        <div>
          <Button type="submit">{t('submit')}</Button>
        </div>
      </Card>

      <aside className="flex flex-col gap-4">
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="text-h3">{t('notPlatform.title')}</h2>
          <p className="text-[15px]">{t('notPlatform.text')}</p>
          <Link to="/orders" className="text-brand underline">
            {t('notPlatform.cta')}
          </Link>
        </Card>
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="text-h3">{t('after.title')}</h2>
          <p className="text-[15px]">{t('after.text')}</p>
        </Card>
      </aside>
    </div>
  );
};

export default FeedbackPage;
