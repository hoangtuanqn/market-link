import { useTranslation } from 'react-i18next';
import { ButtonLink } from '@/components/ui/button';
import useClock from '@/hooks/useClock';
import { dayName, formatDayMonth, nowLabel } from '@/lib/format';
import type { MarketType } from '@/types/market.types';
import OpenMarketsBoard from './OpenMarketsBoard';
import SearchBar from './SearchBar';

/** The demo market weekend: Friday 25 to Sunday 27 September 2026. */
const WEEKEND_FROM = new Date(2026, 8, 25);
const WEEKEND_TO = new Date(2026, 8, 27);
const dayAndDate = (d: Date) => `${dayName(d.getDay())} ${formatDayMonth(d)}`;

const Hero = ({ markets }: { markets: MarketType[] }) => {
  const { t } = useTranslation('Home');
  const now = useClock();

  return (
    <section className="grid items-end gap-8 pt-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-4">
        <p className="font-hand text-hand text-ink-muted">
          <time dateTime={now.toISOString()}>{nowLabel(now)}</time> ·{' '}
          {t('hero.weekend', { from: dayAndDate(WEEKEND_FROM), to: dayAndDate(WEEKEND_TO) })}
        </p>
        <h1 className="font-hand md:text-display text-[44px] leading-12 md:leading-15.5 lg:text-[64px] lg:leading-17">
          {t('hero.title')}
        </h1>
        <p className="text-body-lg max-w-155">{t('hero.intro', { count: markets.length })}</p>

        <SearchBar />

        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink to="/markets">{t('hero.browse')}</ButtonLink>
          <ButtonLink to="/register/farmer" variant="secondary">
            {t('hero.sell')}
          </ButtonLink>
        </div>
      </div>

      <OpenMarketsBoard markets={markets} />
    </section>
  );
};

export default Hero;
