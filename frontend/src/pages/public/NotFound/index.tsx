import { useTranslation } from 'react-i18next';
import { ButtonLink } from '@/components/ui/button';

/** A path that matches no route (including a link to an unbuilt page) — instead of a blank screen. */
const NotFoundPage = () => {
  const { t } = useTranslation('NotFound');
  return (
    <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
      <p className="text-overline text-ink-muted uppercase">{t('overline')}</p>
      <h1 className="text-h2">{t('title')}</h1>
      <p className="text-ink-muted">{t('text')}</p>
      <ButtonLink to="/">{t('home')}</ButtonLink>
    </div>
  );
};

export default NotFoundPage;
