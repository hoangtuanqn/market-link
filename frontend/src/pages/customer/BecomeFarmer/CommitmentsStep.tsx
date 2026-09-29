import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormStep } from '@/components/ui/form-step';

/** One box per commitment: its id, the copy key under `step3`, and the key of its hint. */
const COMMITMENTS = [
  { id: 't1', label: 'step3.true', hint: 'step3.trueHint' },
  { id: 't2', label: 'step3.present', hint: 'step3.presentHint' },
  { id: 't3', label: 'step3.pay', hint: 'step3.payHint' },
] as const;

type CommitmentsStepProps = {
  ticks: [boolean, boolean, boolean];
  termsError?: string;
  isSubmitting: boolean;
  onTick: (index: number, checked: boolean) => void;
  onSaveAndLeave: () => void;
};

/** Step 3: the three commitments, then send — or keep a draft and finish later. */
const CommitmentsStep = ({ ticks, termsError, isSubmitting, onTick, onSaveAndLeave }: CommitmentsStepProps) => {
  const { t } = useTranslation('CustomerBecomeFarmer');
  return (
    <FormStep n={3} title={t('step3.title')}>
      <Card className="flex flex-col gap-4 p-6">
        {termsError && (
          <p role="alert" className="text-danger m-0 text-[15px] font-bold">
            {termsError}
          </p>
        )}
        {COMMITMENTS.map((c, i) => (
          <Checkbox
            key={c.id}
            id={c.id}
            checked={ticks[i]}
            disabled={isSubmitting}
            aria-invalid={!!termsError && !ticks[i]}
            onChange={(e) => onTick(i, e.target.checked)}
          >
            {t(c.label)}
            <small className="text-ink-muted mt-0.5 block text-[13px]">{t(c.hint)}</small>
          </Checkbox>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('step3.sending') : t('step3.send')}
          </Button>
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onSaveAndLeave}>
            {t('step3.later')}
          </Button>
        </div>
      </Card>
    </FormStep>
  );
};

export default CommitmentsStep;
