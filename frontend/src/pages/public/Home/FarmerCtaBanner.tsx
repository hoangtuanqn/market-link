import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ButtonLink } from '@/components/ui/button';

const FarmerCtaBanner = () => {
  const { t } = useTranslation('Home');

  return (
    <section className="border-line-strong text-on-board relative flex flex-col justify-between gap-8 overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-[#273a25] to-[#182615] p-8 shadow-xl md:p-12 lg:flex-row lg:items-center">
      <div className="flex max-w-2xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-accent text-on-accent rounded-full px-3 py-1 font-bold">{t('banner.badge')}</span>
          <span className="text-board-muted">{t('banner.free')}</span>
        </div>

        <h2 className="font-hand text-on-board text-3xl leading-snug font-bold md:text-4xl">{t('banner.title')}</h2>

        <p className="text-board-muted text-[16px] leading-relaxed">{t('banner.desc')}</p>
      </div>

      <div className="flex shrink-0 flex-col items-start gap-3.5 sm:flex-row sm:items-center lg:flex-col lg:items-start">
        <ButtonLink to="/become-farmer" variant="accent" className="px-6 py-3 font-bold whitespace-nowrap">
          {t('banner.apply')}
        </ButtonLink>
        <Link
          to="/about"
          className="text-board-muted hover:text-on-board text-small underline-offset-4 hover:underline"
        >
          {t('banner.guidelines')}
        </Link>
      </div>
    </section>
  );
};

export default FarmerCtaBanner;
