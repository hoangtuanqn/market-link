import { useTranslation } from 'react-i18next';
import { ButtonLink } from '@/components/ui/button';
import useClock from '@/hooks/useClock';
import { dayName, formatDayMonth, upcomingWeekend } from '@/lib/format';
import type { MarketType } from '@/types/market.types';
import OpenMarketsBoard from './OpenMarketsBoard';
import SearchBar from './SearchBar';

const dayAndDate = (d: Date) => `${dayName(d.getDay())} ${formatDayMonth(d)}`;

const Hero = ({ markets }: { markets: MarketType[] }) => {
  const { t } = useTranslation('Home');
  const now = useClock();
  const weekend = upcomingWeekend(now);

  return (
    <section className="grid items-center gap-10 pt-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)] [&>*]:min-w-0">
      <div className="flex flex-col gap-6">
        <div className="border-line-strong bg-surface-raised text-brand inline-flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-[14px] font-semibold shadow-xs">
          <span className="relative flex size-2.5">
            <span className="bg-status-ready-ink absolute inline-flex size-full animate-ping rounded-full opacity-75" />
            <span className="bg-status-ready-ink relative inline-flex size-2.5 rounded-full" />
          </span>
          <span>
            {t('hero.livePill', {
              count: markets.length,
              from: dayAndDate(weekend.from),
              to: dayAndDate(weekend.to),
            })}
          </span>
        </div>

        <h1 className="font-hand text-[44px] leading-[1.08] md:text-[54px] lg:text-[60px]">{t('hero.title')}</h1>

        <p className="text-body-lg text-ink-muted max-w-140">{t('hero.lead')}</p>

        <SearchBar />

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <ButtonLink to="/markets">{t('hero.browse')}</ButtonLink>
          <ButtonLink to="/products" variant="secondary">
            {t('hero.explore')}
          </ButtonLink>
          <ButtonLink to="/become-farmer" variant="ghost" className="text-small text-ink-muted hover:text-ink">
            {t('hero.sellPrompt')}
          </ButtonLink>
        </div>
      </div>

      <OpenMarketsBoard markets={markets} />
    </section>
  );
};

export default Hero;
