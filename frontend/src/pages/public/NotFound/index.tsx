import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { StoreIcon } from '@/components/icons';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ErrorShell from '@/layout/ErrorShell';

type NotFoundPageProps = {
  standalone?: boolean;
};

/**
 * 404 Not Found page for invalid or unbuilt paths. Excludes main header/footer for distraction-free navigation back to
 * the marketplace.
 */
const NotFoundPage = ({ standalone = true }: NotFoundPageProps) => {
  const { t } = useTranslation('NotFound');

  const cardContent = (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="bg-surface-sunken text-brand border-line-strong mx-auto mb-1 flex h-16 w-16 items-center justify-center rounded-full border-[1.5px]">
        <StoreIcon size={28} />
      </div>

      <div className="font-hand text-ink text-6xl font-bold tracking-tight md:text-7xl">404</div>

      <p className="text-overline text-ink-muted font-semibold tracking-wider uppercase">{t('overline')}</p>

      <h1 className="text-h2 text-ink font-sans font-bold">{t('title')}</h1>

      <p className="text-ink-muted mx-auto max-w-md text-sm leading-relaxed md:text-base">{t('text')}</p>

      <div className="flex w-full flex-col items-center justify-center gap-3 pt-3 sm:flex-row">
        <ButtonLink to="/" variant="primary" className="w-full sm:w-auto">
          {t('home')}
        </ButtonLink>
        <ButtonLink to="/markets" variant="secondary" className="w-full sm:w-auto">
          {t('exploreMarkets')}
        </ButtonLink>
      </div>

      <div className="border-line text-ink-muted mt-6 flex flex-wrap items-center justify-center gap-3 border-t pt-4 text-xs">
        <span>{t('quickLinks')}:</span>
        <Link to="/products" className="hover:text-ink underline-offset-4 hover:underline">
          {t('products')}
        </Link>
        <span>·</span>
        <Link to="/map" className="hover:text-ink underline-offset-4 hover:underline">
          {t('marketMap')}
        </Link>
        <span>·</span>
        <Link to="/contact" className="hover:text-ink underline-offset-4 hover:underline">
          {t('contact')}
        </Link>
      </div>
    </div>
  );

  if (!standalone) {
    return <Card className="mx-auto w-full max-w-lg p-6 text-center md:p-10">{cardContent}</Card>;
  }

  return <ErrorShell>{cardContent}</ErrorShell>;
};

export default NotFoundPage;
