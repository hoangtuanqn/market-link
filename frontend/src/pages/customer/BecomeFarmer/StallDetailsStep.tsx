import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { FormStep } from '@/components/ui/form-step';
import { Field } from '@/components/ui/input';
import type { UserType } from '@/types/user.types';
import { MAX, type FormErrors } from './constants';

type StallDetailsStepProps = {
  user: UserType | null;
  stallName: string;
  contactPerson: string;
  description: string;
  errors: FormErrors;
  isSubmitting: boolean;
  onStallNameChange: (value: string) => void;
  onContactPersonChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
};

/** Step 1: the stall and who runs it; email, phone and address are read from the account. */
const StallDetailsStep = ({
  user,
  stallName,
  contactPerson,
  description,
  errors,
  isSubmitting,
  onStallNameChange,
  onContactPersonChange,
  onDescriptionChange,
}: StallDetailsStepProps) => {
  const { t } = useTranslation('CustomerBecomeFarmer');
  return (
    <FormStep n={1} title={t('step1.title')}>
      <Card className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            id="stall"
            label={t('step1.stallName')}
            required
            placeholder={t('step1.stallNamePlaceholder')}
            value={stallName}
            onChange={(e) => onStallNameChange(e.target.value)}
            hint={t('step1.stallNameHint')}
            error={errors.stallName}
            disabled={isSubmitting}
            containerClassName="md:col-span-2"
          />
          <Field
            id="person"
            label={t('step1.person')}
            required
            value={contactPerson}
            onChange={(e) => onContactPersonChange(e.target.value)}
            error={errors.contactPerson}
            disabled={isSubmitting}
          />
          <Field id="email" label={t('step1.email')} value={user?.email ?? ''} readOnly hint={t('step1.emailHint')} />
          <Field id="phone" label={t('step1.phone')} value={user?.phone ?? ''} readOnly hint={t('step1.fromAccount')} />
          <Field
            id="address"
            label={t('step1.address')}
            value={user?.address ?? ''}
            readOnly
            hint={t('step1.fromAccount')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="about" className="text-small font-bold">
            {t('step1.about')}
          </label>
          <textarea
            id="about"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t('step1.aboutPlaceholder')}
            aria-invalid={!!errors.description}
            aria-describedby="about-note"
            disabled={isSubmitting}
            className={`bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3 ${
              errors.description ? 'border-danger' : 'border-line-strong'
            }`}
          />
          <span
            id="about-note"
            role={errors.description ? 'alert' : undefined}
            className={`text-[13px] ${errors.description ? 'text-danger' : 'text-ink-muted'}`}
          >
            {errors.description ?? t('step1.aboutCount', { used: description.trim().length, max: MAX.description })}
          </span>
        </div>
      </Card>
    </FormStep>
  );
};

export default StallDetailsStep;
