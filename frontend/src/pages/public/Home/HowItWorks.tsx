import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';

const STEPS = ['reserve', 'confirm', 'pickup'] as const;

const HowItWorks = () => {
  const { t } = useTranslation('Home');
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-h2">{t('how.title')}</h2>
      <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, i) => (
          <Card as="li" key={step} className="flex flex-col gap-2 p-4">
            <span aria-hidden="true" className="font-hand text-brand text-[40px] leading-none">
              {i + 1}
            </span>
            <h3 className="text-h3">{t(`how.steps.${step}.title`)}</h3>
            <p className="text-ink-muted text-[15px]">{t(`how.steps.${step}.text`)}</p>
          </Card>
        ))}
      </ol>
    </section>
  );
};

export default HowItWorks;
