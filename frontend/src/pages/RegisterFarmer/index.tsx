import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';

/** FR-002 — Farmer registration; the stall is reviewed by an admin before it goes live (D-09). */
const RegisterFarmerPage = () => {
  const { t } = useTranslation('RegisterFarmer');
  const navigate = useNavigate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate('/farmer/pending');
  };

  return (
    <div className="mx-auto flex w-full max-w-160 flex-col">
      <Card as="form" onSubmit={onSubmit} className="mt-6 flex flex-col gap-4 p-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-hand text-h1">{t('title')}</h1>
          <p className="text-small text-ink-muted">{t('intro')}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            id="stall"
            label={t('fields.stall')}
            required
            placeholder={t('fields.stallPlaceholder', { example: 'Cô Tư Garden' })}
            hint={t('fields.stallHint')}
            className="md:col-span-2"
          />
          <Field id="person" label={t('fields.person')} required autoComplete="name" placeholder="Nguyễn Thị Tư" />
          <Field id="phone" label={t('fields.phone')} required inputMode="tel" autoComplete="tel" />
          <Field id="email" label={t('fields.email')} type="email" required autoComplete="email" />
          <Field id="address" label={t('fields.address')} required autoComplete="street-address" />
          <Field
            id="pw"
            label={t('fields.password')}
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Field id="pw2" label={t('fields.confirmPassword')} type="password" required autoComplete="new-password" />
        </div>

        <Banner title={t('banner.title')}>{t('banner.text')}</Banner>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="submit">{t('submit')}</Button>
          <Link to="/login" className="text-small text-brand underline">
            {t('haveAccount')}
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default RegisterFarmerPage;
