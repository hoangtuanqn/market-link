import { useTranslation } from 'react-i18next';
import { ButtonLink } from '@/components/ui/button';
import useClock from '@/hooks/useClock';
import { dayName, formatDayMonth, nextSevenDays, nowLabel } from '@/lib/format';
import type { MarketType } from '@/types/market.types';
import OpenMarketsBoard from './OpenMarketsBoard';
import SearchBar from './SearchBar';

const dayAndDate = (d: Date) => `${dayName(d.getDay())} ${formatDayMonth(d)}`;

/**
 * The market weekend (Friday to Sunday) that is on now or comes next: the Sunday of the coming seven days and the
 * Friday before it. On a Sunday that is the weekend in progress; from Monday on, the next one.
 */
const marketWeekend = (now: Date) => {
  const sunday = nextSevenDays(now).find((d) => d.dow === 0)!.date;
  return { from: new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() - 2), to: sunday };
};

const Hero = ({ markets }: { markets: MarketType[] }) => {
  const { t } = useTranslation('Home');
  const now = useClock();
  const weekend = marketWeekend(now);

  return (
    <section className="grid items-end gap-8 pt-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-4">
        <p className="font-hand text-hand text-ink-muted">
          <time dateTime={now.toISOString()}>{nowLabel(now)}</time> ·{' '}
          {t('hero.weekend', { from: dayAndDate(weekend.from), to: dayAndDate(weekend.to) })}
        </p>
        <h1 className="font-hand md:text-display text-[44px] leading-12 md:leading-15.5 lg:text-[64px] lg:leading-17">
          {t('hero.title')}
        </h1>
        <p className="text-body-lg max-w-155">{t('hero.intro', { count: markets.length })}</p>

        <SearchBar />

        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink to="/markets">{t('hero.browse')}</ButtonLink>
          <ButtonLink to="/become-farmer" variant="secondary">
            {t('hero.sell')}
          </ButtonLink>
        </div>
      </div>

      <OpenMarketsBoard markets={markets} />
    </section>
  );
};

export default Hero;
