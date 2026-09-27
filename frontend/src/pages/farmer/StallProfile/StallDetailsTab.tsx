import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';
import { dayName, formatClock } from '@/lib/format';
import type { UserType } from '@/types/user.types';
import { cutoffExample, type FormErrors, type StallForm } from './constants';

type StallDetailsTabProps = {
  form: StallForm;
  errors: FormErrors;
  saving: boolean;
  user: UserType | null;
  onChange: (patch: Partial<StallForm>) => void;
  onSave: () => void;
};

/** The stall tab: name, contact person, the account's contact details, the introduction and the order cutoff. */
const StallDetailsTab = ({ form, errors, saving, user, onChange, onSave }: StallDetailsTabProps) => {
  const { t } = useTranslation('FarmerStallProfile');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="flex flex-col gap-6"
      noValidate
    >
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-h3">{t('details.title')}</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            id="stall"
            label={t('details.stallName')}
            required
            value={form.stallName}
            onChange={(e) => onChange({ stallName: e.target.value })}
            error={errors.stall}
          />
          <Field
            id="person"
            label={t('details.person')}
            required
            value={form.person}
            onChange={(e) => onChange({ person: e.target.value })}
            error={errors.person}
          />
          <Field
            id="phone"
            label={t('details.phone')}
            value={user?.phone ?? ''}
            readOnly
            hint={t('details.accountHint')}
          />
          <Field id="email" label={t('details.email')} type="email" value={user?.email ?? ''} readOnly />
          <div className="md:col-span-2">
            <Field id="addr" label={t('details.address')} value={user?.address ?? ''} readOnly />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label htmlFor="about" className="text-small font-bold">
              {t('details.about')}
            </label>
            <textarea
              id="about"
              value={form.about}
              onChange={(e) => onChange({ about: e.target.value })}
              className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
            />
            <span className="text-ink-muted text-[13px]">{t('details.aboutHint')}</span>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-h3">{t('cutoff.title')}</h2>
        <Field
          id="cut"
          label={t('cutoff.label')}
          required
          inputMode="numeric"
          value={form.cutoffHours}
          onChange={(e) => onChange({ cutoffHours: Math.max(0, Number(e.target.value) || 0) })}
          error={errors.cut}
          hint={t('cutoff.hint', {
            count: form.cutoffHours,
            slot: formatClock('07:00'),
            saturday: dayName(6, 'long'),
            ...cutoffExample(form.cutoffHours),
          })}
        />
      </Card>

      <div>
        <Button type="submit" disabled={saving}>
          {t('details.save')}
        </Button>
      </div>
    </form>
  );
};

export default StallDetailsTab;
