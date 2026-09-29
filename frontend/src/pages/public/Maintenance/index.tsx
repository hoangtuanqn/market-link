import { useTranslation } from 'react-i18next';
import { ClockIcon } from '@/components/icons';
import { Button, ButtonAnchor } from '@/components/ui/button';
import ErrorShell from '@/layout/ErrorShell';

const MaintenancePage = () => {
  const { t } = useTranslation('Maintenance');

  return (
    <ErrorShell>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="bg-surface-sunken text-brand border-line-strong mx-auto mb-1 flex h-16 w-16 items-center justify-center rounded-full border-[1.5px]">
          <ClockIcon size={28} />
        </div>

        <p className="text-overline text-ink-muted font-semibold tracking-wider uppercase">{t('overline')}</p>

        <h1 className="text-h2 text-ink font-hand font-normal">{t('title')}</h1>

        <p className="text-ink-muted mx-auto max-w-md text-sm leading-relaxed md:text-base">{t('text')}</p>

        <div className="flex w-full flex-col items-center justify-center gap-3 pt-3 sm:flex-row">
          <Button variant="primary" className="w-full sm:w-auto" onClick={() => window.location.reload()}>
            {t('tryAgain')}
          </Button>
          <ButtonAnchor href="mailto:admin@marketlink.vn" variant="secondary" className="w-full sm:w-auto">
            {t('emailSupport')}
          </ButtonAnchor>
        </div>

        <div className="border-line text-ink-muted mt-6 border-t pt-4 text-xs">{t('thanks')}</div>
      </div>
    </ErrorShell>
  );
};

export default MaintenancePage;
