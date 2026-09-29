import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';

const STEPS = ['reserve', 'confirm', 'pickup'] as const;

const HowItWorks = () => {
  const { t } = useTranslation('Home');
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col items-center text-center">
        <span className="text-brand text-[12px] font-bold tracking-widest uppercase">{t('how.eyebrow')}</span>
        <h2 className="text-h2 mt-1">{t('how.title')}</h2>
        <p className="text-ink-muted text-body mt-1 max-w-160">{t('how.desc')}</p>
      </div>

      <ol className="m-0 grid list-none gap-6 p-0 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Card as="li" key={step} className="flex flex-col gap-4 rounded-xl p-7 shadow-xs">
            <div className="flex items-center gap-3.5">
              <span
                aria-hidden="true"
                className="bg-brand text-on-brand font-hand flex size-11 items-center justify-center rounded-full text-2xl font-bold shadow-xs"
              >
                {i + 1}
              </span>
              <h3 className="text-ink text-[19px] leading-tight font-bold">{t(`how.steps.${step}.title`)}</h3>
            </div>

            <p className="text-ink-muted text-[15px] leading-relaxed">{t(`how.steps.${step}.text`)}</p>

            <div className="border-line-strong/60 text-brand mt-auto flex items-center gap-2 border-t border-dashed pt-3 text-[13px] font-semibold">
              <span className="text-status-ready-ink font-bold">✓</span>
              <span>{t(`how.steps.${step}.highlight`)}</span>
            </div>
          </Card>
        ))}
      </ol>
    </section>
  );
};

export default HowItWorks;
